import { availableClients } from "@/constants/clients";
import { useCCProjectStore } from "@/stores/ccProject";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useRepoUrlStore } from "@/stores/repoUrl";
import type { ServerType } from "@/types";
import { useState } from "react";
import { ServerConfigDialog } from "../dialog";
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
  const selectedScope = useCCProjectStore(state => state.selectedScope);
  const targetLabel = availableClients.find(client => client.value === selectedClient)?.label ?? selectedClient;
  const targetKey = JSON.stringify([selectedClient, selectedPath, selectedClient === "claude_code" ? [selectedProject, selectedScope] : null]);

  const openDialog = (server: ServerType) => {
    setCurrentServer(server);
    setRepoUrl(server.source);
    setIsDialogOpen(true);
  };

  const quickAdd = async (server: ServerType): Promise<boolean> => {
    // Confirm the destination before writing, without navigating to details.
    openDialog(server);
    return false;
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
