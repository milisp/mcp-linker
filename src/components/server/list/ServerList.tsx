import { availableClients } from "@/constants/clients";
import { useCCProjectStore } from "@/stores/ccProject";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useRepoUrlStore } from "@/stores/repoUrl";
import type { ServerType } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { toast } from "sonner";
import { ServerConfigDialog } from "../dialog";
import { useSaveServerConfig } from "../hooks/useSaveServerConfig";
import { quickInstallConfig } from "../utils/quickInstall";
import { ServerCard } from "./ServerCard";

interface ServerListProps {
  mcpServers: ServerType[];
}

export function ServerList({ mcpServers }: ServerListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentServer, setCurrentServer] = useState<ServerType | null>(null);
  const setRepoUrl = useRepoUrlStore(state => state.setRepoUrl);
  const { selectedClient, selectedPath } = useClientPathStore();
  const selectedProject = useCCProjectStore(state => state.selectedProject);
  const { saveServerConfig } = useSaveServerConfig();
  const targetLabel = availableClients.find(client => client.value === selectedClient)?.label ?? selectedClient;
  const targetKey = JSON.stringify([selectedClient, selectedPath, selectedClient === "claude_code" ? selectedProject : null]);

  const openDialog = (server: ServerType) => {
    setCurrentServer(server);
    setRepoUrl(server.source);
    setIsDialogOpen(true);
  };

  const quickAdd = async (server: ServerType): Promise<boolean> => {
    const config = quickInstallConfig(server);
    if (!config) {
      openDialog(server);
      return false;
    }
    const serverName = server.id.split("/").pop() || server.name;
    if (selectedClient === "claude_code") {
      if (!selectedProject) {
        toast.error("Please select a Claude Code project in the header");
        return false;
      }
      // The Claude Code add command overwrites existing entries. Let the user
      // review an existing name in the editor instead of replacing it on one click.
      try {
        const existing = await invoke<{ name: string }[]>("claude_mcp_list", { workingDir: selectedProject });
        if (existing.some(entry => entry.name === serverName)) {
          toast.info("This server already exists. Review its configuration before saving.");
          openDialog(server);
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
    <div>
      <div className="grid w-full grid-cols-1 gap-2 xl:grid-cols-2">
        {mcpServers.map(server => (
          <ServerCard key={server.id} server={server} onOpenDialog={openDialog} onQuickAdd={quickAdd} targetLabel={targetLabel} targetKey={targetKey} />
        ))}
      </div>
      {currentServer && (
        <ServerConfigDialog isOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} currentServer={currentServer} />
      )}
    </div>
  );
}
