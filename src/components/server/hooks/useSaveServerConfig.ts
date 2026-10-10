import { mustHavePathClients } from "@/lib/data";
// useSaveServerConfig.ts
import { useMcpRefresh } from "@/contexts/McpRefreshContext";
import { useCCProjectStore } from "@/stores/ccProject";
import type { ServerConfig, ServerType } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { LOCAL_STORAGE_KEY } from "./useLocalDraft";

interface SaveServerConfigParams {
  selectedClient: string;
  selectedPath: string;
  currentServer: ServerType;
  serverName: string;
  config: ServerConfig | null;
  setIsDialogOpen: (open: boolean) => void;
  onSuccess?: () => void;
  clearDraftOnSuccess?: boolean;
}

export function useSaveServerConfig() {
  const { refreshServerList } = useMcpRefresh();
  const { selectedProject } = useCCProjectStore();
  
  async function updateConfig(
    selectedClient: string,
    selectedPath: string,
    selectedServer: string,
    currentServer: ServerType,
    value: ServerConfig,
  ) {
    try {
      // Save to selected client
      if (selectedClient === "claude_code") {
        // Map to Claude Code add request
        if (!selectedProject) {
          toast.error("Please select a Claude Code project in header");
          throw new Error("Claude Code project not selected");
        }
        const req: any = { name: selectedServer };
        if ((value as any).command) {
          req.type = "stdio";
          req.command = (value as any).command;
          req.args = (value as any).args || [];
          if ((value as any).env) req.env = (value as any).env;
        } else if ((value as any).url) {
          req.type = (value as any).type || "http";
          req.url = (value as any).url;
          if ((value as any).headers) req.headers = (value as any).headers;
        } else {
          throw new Error("Unsupported config for Claude Code");
        }
        await invoke("claude_mcp_add", {
          request: req,
          workingDir: selectedProject,
        });
      } else {
        await invoke("add_mcp_server", {
          clientName: selectedClient,
          path: selectedPath,
          serverName: selectedServer,
          serverConfig: value,
        });
      }
      // Always append to mcplinker history
      try {
        await invoke("add_mcp_server", {
          clientName: "mcplinker",
          path: "",
          serverName: selectedServer,
          serverConfig: value,
        });
      } catch (e) {
        // already have
      }
      console.log("add server", new Date(), currentServer);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  const saveServerConfig = async ({
    selectedClient,
    selectedPath,
    currentServer,
    serverName,
    config,
    setIsDialogOpen,
    onSuccess,
    clearDraftOnSuccess = true,
  }: SaveServerConfigParams): Promise<boolean> => {
    if (mustHavePathClients.includes(selectedClient) && !selectedPath) {
      toast.error("Path is required");
      return false;
    }
    if (!currentServer) {
      toast.error("Please select a server");
      return false;
    }

    if (config) {
      try {
        await updateConfig(
          selectedClient,
          selectedPath,
          serverName,
          currentServer,
          config,
        );
        try {
          console.log("Saving to myservers:", serverName, config);
          const savedMyServers = localStorage.getItem("myservers");
          console.log("Current myservers:", savedMyServers);
          const parsedMyServers = savedMyServers
            ? JSON.parse(savedMyServers)
            : [];

          const newServer = {
            name: serverName,
            config: config,
          };

          const index = parsedMyServers.findIndex(
            (s: any) => s.name === serverName,
          );
          if (index !== -1) {
            parsedMyServers[index] = newServer;
            console.log(`Updated existing server with name: ${serverName}`);
          } else {
            parsedMyServers.push(newServer);
            console.log(`Added new server with name: ${serverName}`);
          }

          localStorage.setItem("myservers", JSON.stringify(parsedMyServers));
          console.log("Updated myservers:", parsedMyServers);
        } catch (error) {
          console.error("Failed to save to myservers:", error);
        }
        
        // Use unified refresh system
        refreshServerList(selectedClient, selectedPath);
        
        setIsDialogOpen(false);
        toast.success("Configuration updated successfully");
        if (clearDraftOnSuccess) localStorage.removeItem(LOCAL_STORAGE_KEY);
        
        // Call custom success callback if provided
        onSuccess?.();
        return true;
      } catch (error) {
        console.error("Failed to update config:", error);
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`Failed to update configuration: ${message}`);
        return false;
      }
    }
    return false;
  };

  return { saveServerConfig };
}
