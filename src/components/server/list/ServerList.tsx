import { availableClients } from "@/constants/clients";
import { useCCProjectStore } from "@/stores/ccProject";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useRepoUrlStore } from "@/stores/repoUrl";
import { useViewStore } from "@/stores/viewStore";
import type { ServerType } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useSaveServerConfig } from "../hooks/useSaveServerConfig";
import { quickInstallConfig } from "../utils/quickInstall";
import { ServerCard } from "./ServerCard";

interface ServerListProps {
  mcpServers: ServerType[];
}

export function ServerList({ mcpServers }: ServerListProps) {
  const setRepoUrl = useRepoUrlStore(state => state.setRepoUrl);
  const navigate = useViewStore(state => state.navigate);
  const { selectedClient, selectedPath } = useClientPathStore();
  const selectedProject = useCCProjectStore(state => state.selectedProject);
  const selectedScope = useCCProjectStore(state => state.selectedScope);
  const { saveServerConfig } = useSaveServerConfig();
  const targetLabel = availableClients.find(client => client.value === selectedClient)?.label ?? selectedClient;
  const targetKey = JSON.stringify([selectedClient, selectedPath, selectedClient === "claude_code" ? [selectedProject, selectedScope] : null]);

  const openDetails = (server: ServerType) => {
    setRepoUrl(server.source);
    navigate(`/servers/${encodeURIComponent(server.id)}`);
  };

  const quickAdd = async (server: ServerType): Promise<boolean> => {
    const config = quickInstallConfig(server);
    if (!config) {
      openDetails(server);
      return false;
    }
    const serverName = server.id.split("/").pop() || server.name;
    if (selectedClient === "claude_code" && (selectedScope === "user" || selectedProject)) {
      // The Claude Code add command overwrites existing entries. Let the user
      // review an existing name on the details page instead of replacing it on one click.
      try {
        const existing = await invoke<{ name: string }[]>("claude_mcp_list", { workingDir: selectedProject || "", scope: selectedScope });
        if (existing.some(entry => entry.name === serverName)) {
          toast.info("This server already exists. Review its configuration before saving.");
          openDetails(server);
          return false;
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
        return false;
      }
    }
    return saveServerConfig({
      selectedClient,
      selectedPath: selectedPath || "",
      currentServer: server,
      serverName,
      config,
      setIsDialogOpen: () => {},
      clearDraftOnSuccess: false,
    });
  };

  if (mcpServers.length === 0) return <p className="text-sm text-muted-foreground">No servers match your criteria.</p>;

  return (
    <div className="grid w-full grid-cols-1 gap-2 xl:grid-cols-2">
      {mcpServers.map(server => (
        <ServerCard key={server.id} server={server} onOpenDetails={openDetails} onQuickAdd={quickAdd} targetLabel={targetLabel} targetKey={targetKey} />
      ))}
    </div>
  );
}
