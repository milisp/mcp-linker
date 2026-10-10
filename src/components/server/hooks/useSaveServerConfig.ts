import { mustHavePathClients } from "@/lib/data";
// useSaveServerConfig.ts
import { useMcpRefresh } from "@/contexts/McpRefreshContext";
import { requireLocalClaudeScope, useCCProjectStore } from "@/stores/ccProject";
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
  mode?: "add" | "update";
  disabled?: boolean;
}

export function useSaveServerConfig() {
  const { refreshServerList } = useMcpRefresh();
  const { selectedProject, selectedScope } = useCCProjectStore();
  
  async function updateConfig(
    selectedClient: string,
    selectedPath: string,
    selectedServer: string,
    value: ServerConfig,
    mode: "add" | "update",
    disabled: boolean,
  ) {
    try {
      // Save to selected client
      if (selectedClient === "claude_code") {
        // Map to Claude Code add request
        if (selectedScope !== "user" && !selectedProject) {
          toast.error("Please select a Claude Code project in the installation target selector");
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
        if (disabled) {
          requireLocalClaudeScope(selectedScope);
          await invoke("claude_update_disabled", { workingDir: selectedProject, scope: selectedScope, name: selectedServer, serverConfig: value });
        }
        else await invoke("claude_mcp_add", {
          request: req,
          workingDir: selectedProject || "",
          scope: selectedScope,
        });
      } else {
        await invoke(disabled ? "update_disabled_mcp_server" : mode === "update" ? "update_mcp_server" : "add_mcp_server", {
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
    mode = "add",
    disabled = false,
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
          config,
          mode,
          disabled,
        );
        try {
          const savedMyServers = localStorage.getItem("myservers");
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
          } else {
            parsedMyServers.push(newServer);
          }

          localStorage.setItem("myservers", JSON.stringify(parsedMyServers));
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
