import { availableClients } from "@/constants/clients";
import { useCCProjectStore } from "@/stores/ccProject";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useViewStore } from "@/stores/viewStore";
import type { ServerType } from "@/types";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSaveServerConfig } from "../hooks/useSaveServerConfig";
import { fetchInstalledNames } from "../utils/installedServer";
import { defaultServerName as serverName, quickInstallConfig } from "../utils/quickInstall";
import { ServerCard } from "./ServerCard";

interface ServerListProps {
  mcpServers: ServerType[];
  onRemove?: (server: ServerType) => Promise<void>;
  emptyMessage?: string;
}

export function ServerList({ mcpServers, onRemove, emptyMessage = "No servers match your criteria." }: ServerListProps) {
  const navigate = useViewStore(state => state.navigate);
  const { selectedClient, selectedPath } = useClientPathStore();
  const selectedProject = useCCProjectStore(state => state.selectedProject);
  const selectedScope = useCCProjectStore(state => state.selectedScope);
  const { saveServerConfig } = useSaveServerConfig();
  const targetLabel = availableClients.find(client => client.value === selectedClient)?.label ?? selectedClient;
  const targetKey = JSON.stringify([selectedClient, selectedPath, selectedClient === "claude_code" ? [selectedProject, selectedScope] : null]);
  // Installed names belong to one target; ignore them once the target changes.
  const [installed, setInstalled] = useState<{ targetKey: string; names: Set<string> } | null>(null);
  const installedNames = installed?.targetKey === targetKey ? installed.names : null;
  const markInstalled = (name: string) => setInstalled(current => current?.targetKey === targetKey ? { targetKey, names: new Set(current.names).add(name) } : current);

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchInstalledNames(selectedClient, selectedPath, selectedProject, selectedScope)
      .then(names => { if (!cancelled) setInstalled({ targetKey, names }); })
      .catch(() => { if (!cancelled) setInstalled(null); });
    void load();
    window.addEventListener("mcpServerListChanged", load);
    return () => { cancelled = true; window.removeEventListener("mcpServerListChanged", load); };
  }, [targetKey]);

  const openDetails = (server: ServerType) => {
    navigate(`/servers/${encodeURIComponent(server.id)}`);
  };

  const quickAdd = async (server: ServerType): Promise<boolean> => {
    const config = quickInstallConfig(server);
    if (!config) {
      openDetails(server);
      return false;
    }
    const name = serverName(server);
    // Adding overwrites a server with the same name, so check the target again
    // instead of trusting names loaded when the list opened.
    try {
      const names = await fetchInstalledNames(selectedClient, selectedPath, selectedProject, selectedScope);
      setInstalled({ targetKey, names });
      if (names.has(name)) {
        toast.info(`${name} is already installed in ${targetLabel}`);
        return false;
      }
    } catch {
      // Unreadable or missing config: saving reports the real problem.
    }
    const saved = await saveServerConfig({
      selectedClient,
      selectedPath: selectedPath || "",
      currentServer: server,
      serverName: name,
      config,
      setIsDialogOpen: () => {},
      clearDraftOnSuccess: false,
    });
    if (saved) markInstalled(name);
    return saved;
  };

  if (mcpServers.length === 0) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;

  return (
    <div className="grid w-full grid-cols-1 gap-2 xl:grid-cols-2">
      {mcpServers.map(server => (
        <ServerCard key={server.id} server={server} installed={!!installedNames?.has(serverName(server))} onOpenDetails={openDetails} onQuickAdd={quickAdd} targetLabel={targetLabel} onRemove={onRemove} />
      ))}
    </div>
  );
}
