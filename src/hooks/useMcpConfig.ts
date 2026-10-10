import { mustHavePathClients } from "@/lib/data";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useCCProjectStore } from "@/stores/ccProject";
import { ConfigType } from "@/types/mcpConfig";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function useMcpConfig(
  selectedClient: string,
  selectedPath: string | null,
) {
  const [config, setConfig] = useState<ConfigType>({ mcpServers: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disabledServers, setDisabledServers] = useState<Record<string, any>>(
    {},
  );
  const { getClientPath } = useClientPathStore();
  const { selectedProject } = useCCProjectStore();

  // Helper to centralize common operation logic
  const executeMcpOperation = useCallback(
    async (
      operationPromise: Promise<any>, // The promise returned by the invoke call
      successMessage: string,
      errorMessagePrefix: string,
      timeoutMs: number = 15000, // default 15s
      showSuccessToast: boolean = true,
    ): Promise<any> => {
      console.log("executeMcpOperation called");
      try {
        // add timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Operation timed out after ${timeoutMs / 1000} seconds`,
                ),
              ),
            timeoutMs,
          ),
        );

        const result = await Promise.race([operationPromise, timeoutPromise]);
        if (showSuccessToast) toast.success(successMessage);
        return result; // Return the result of the operation
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : errorMessagePrefix;
        toast.error(errorMessage);
        throw error; // Re-throw to allow caller to handle
      }
    },
    [],
  );

  const loadConfig = useCallback(async () => {
    console.log(
      "loadConfig called with client:",
      selectedClient,
      "path:",
      selectedPath,
    );
    setIsLoading(true);
    setError(null);
    try {
      if (mustHavePathClients.includes(selectedClient) && !selectedPath) {
        toast("Path is required for custom client");
      }

      let data: any;
      if (selectedClient === "claude_code") {
        if (!selectedProject) {
          throw new Error("Please select a Claude Code project");
        }
        const list = await executeMcpOperation(
          invoke<any[]>("claude_mcp_list", { workingDir: selectedProject }),
          "Configuration loaded successfully",
          "Failed to load configuration",
          15000,
          false,
        );
        const mapped: any = { mcpServers: {} };
        for (const s of list || []) {
          if (s.type === "stdio") {
            mapped.mcpServers[s.name] = {
              type: "stdio",
              command: s.command || "",
              args: s.args || [],
              env: s.env || {},
            };
          } else {
            mapped.mcpServers[s.name] = {
              type: s.type || "http",
              url: s.url || "",
            };
          }
        }
        data = mapped;
        // Load disabled for Claude Code from separate store
        const disabledData = await executeMcpOperation(
          invoke<Record<string, any>>("claude_list_disabled", {
            workingDir: selectedProject,
          }),
          "Disabled servers loaded successfully",
          "Failed to load disabled servers",
          15000,
          false,
        );
        setDisabledServers(disabledData || {});
        // Disabled servers stay in mcpServers natively; keep them out of the active list
        for (const name of Object.keys(disabledData || {})) {
          delete mapped.mcpServers[name];
        }
      } else {
        data = await executeMcpOperation(
          invoke("read_json_file", {
            clientName: selectedClient,
            path: selectedPath || undefined,
          }),
          "Configuration loaded successfully",
          "Failed to load configuration",
          15000,
          false,
        );

        // Load disabled servers for non-claude_code
        const disabledData = await executeMcpOperation(
          invoke<Record<string, any>>("list_disabled_servers", {
            clientName: selectedClient,
            path: selectedPath || undefined,
          }),
          "Disabled servers loaded successfully",
          "Failed to load disabled servers",
          15000,
          false,
        );
        setDisabledServers(disabledData);
      }

      setConfig(data?.mcpServers ? data : { mcpServers: {} });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load configuration";
      setError(errorMessage);
      setConfig({ mcpServers: {} });
      setDisabledServers({});
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient, selectedPath, executeMcpOperation]);

  const updateConfig = useCallback(
    async (
      key: string,
      updatedConfig: ConfigType["mcpServers"][string],
      isDisabled?: boolean,
    ) => {
      try {
        if (selectedClient === "claude_code" && isDisabled) {
          if (!selectedProject) throw new Error("Please select a Claude Code project");
          await executeMcpOperation(
            invoke("claude_update_disabled", {
              workingDir: selectedProject,
              name: key,
              serverConfig: updatedConfig,
            }),
            "Configuration updated successfully",
            "Failed to update configuration",
          );
        } else if (selectedClient === "claude_code") {
          if (!selectedProject) throw new Error("Please select a Claude Code project");
          await executeMcpOperation(
            invoke("claude_mcp_add", {
              request: {
                name: key,
                ...(updatedConfig as any).command
                  ? {
                      type: "stdio",
                      command: (updatedConfig as any).command,
                      args: (updatedConfig as any).args || [],
                      env: (updatedConfig as any).env || {},
                    }
                  : {
                      type: (updatedConfig as any).type || "http",
                      url: (updatedConfig as any).url || "",
                    },
              },
              workingDir: selectedProject,
            }),
            "Configuration updated successfully",
            "Failed to update configuration",
          );
        } else if (isDisabled) {
          await executeMcpOperation(
            invoke("update_disabled_mcp_server", {
              clientName: selectedClient,
              path: selectedPath || undefined,
              serverName: key,
              serverConfig: updatedConfig,
            }),
            "Configuration updated successfully",
            "Failed to update configuration",
          );
        } else {
          await executeMcpOperation(
            invoke("update_mcp_server", {
              clientName: selectedClient,
              path: selectedPath || undefined,
              serverName: key,
              serverConfig: updatedConfig,
            }),
            "Configuration updated successfully",
            "Failed to update configuration",
          );
        }
        await loadConfig();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update configuration";
        toast.error(errorMessage);
      }
    },
    [selectedClient, selectedPath, executeMcpOperation, loadConfig],
  );

  const deleteConfig = useCallback(
    async (key: string) => {
      if (selectedClient === "custom" && !selectedPath) {
        toast.error(
          "Cannot delete config: selectedPath is required for custom app",
        );
        return;
      }
      try {
        if (selectedClient === "claude_code") {
          if (!selectedProject) throw new Error("Please select a Claude Code project");
          await executeMcpOperation(
            invoke("claude_mcp_remove", {
              name: key,
              workingDir: selectedProject,
            }),
            "Configuration deleted successfully",
            "Failed to delete configuration",
          );
        } else {
          await executeMcpOperation(
            invoke("remove_mcp_server", {
              clientName: selectedClient,
              path: selectedPath || undefined,
              serverName: key,
            }),
            "Configuration deleted successfully",
            "Failed to delete configuration",
          );
        }
        await loadConfig();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to delete configuration";
        toast.error(errorMessage);
      }
    },
    [selectedClient, selectedPath, executeMcpOperation, loadConfig],
  );

  const enableServer = useCallback(
    async (key: string): Promise<void> => {
      try {
        if (selectedClient === "claude_code") {
          if (!selectedProject) throw new Error("Please select a Claude Code project");
          await executeMcpOperation(
            invoke("claude_enable_server", {
              workingDir: selectedProject,
              name: key,
            }),
            "Server enabled successfully",
            "Failed to enable server",
          );
        } else {
          await executeMcpOperation(
            invoke("enable_mcp_server", {
              clientName: selectedClient,
              path: selectedPath || undefined,
              serverName: key,
            }),
            "Server enabled successfully",
            "Failed to enable server",
          );
        }
        await loadConfig();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to enable server";
        toast.error(errorMessage);
      }
    },
    [selectedClient, selectedPath, selectedProject, executeMcpOperation, loadConfig],
  );

  const disableServer = useCallback(
    async (key: string): Promise<void> => {
      try {
        if (selectedClient === "claude_code") {
          if (!selectedProject) throw new Error("Please select a Claude Code project");
          await executeMcpOperation(
            invoke("claude_disable_server", {
              workingDir: selectedProject,
              name: key,
            }),
            "Server disabled successfully",
            "Failed to disable server",
          );
        } else {
          await executeMcpOperation(
            invoke("disable_mcp_server", {
              clientName: selectedClient,
              path: selectedPath || undefined,
              serverName: key,
            }),
            "Server disabled successfully",
            "Failed to disable server",
          );
        }
        await loadConfig();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to disable server";
        toast.error(errorMessage);
      }
    },
    [selectedClient, selectedPath, selectedProject, executeMcpOperation, loadConfig],
  );

  const syncConfig = useCallback(
    async (fromClient: string, toClient: string, overrideAll: boolean) => {
      try {
        setIsLoading(true);
        setError(null);

        // Get paths for both clients
        const fromPath = getClientPath(fromClient);
        const toPath = getClientPath(toClient);

        await executeMcpOperation(
          invoke("sync_mcp_config", {
            fromClient,
            toClient,
            fromPath,
            toPath,
            overrideAll,
          }),
          `Configuration synced from ${fromClient} to ${toClient} successfully`,
          "Failed to sync configuration",
        );
        await loadConfig();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to sync configuration";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      selectedClient,
      selectedPath,
      executeMcpOperation,
      loadConfig,
      getClientPath,
    ],
  );

  const batchDeleteServers = useCallback(
    async (keys: string[]) => {
      if (selectedClient === "custom" && !selectedPath) {
        toast.error(
          "Cannot delete config: selectedPath is required for custom app",
        );
        return;
      }

      // Don't set isLoading here - let executeMcpOperation handle it through loadConfig
      setError(null);

      try {
        await executeMcpOperation(
          invoke("batch_delete_mcp_servers", {
            clientName: selectedClient,
            path: selectedPath || undefined,
            serverNames: keys,
          }),
          `Successfully deleted ${keys.length} server${keys.length > 1 ? "s" : ""}`,
          "Failed to delete configurations",
          30000, // Reduced timeout to 30s for better UX
        );
        await loadConfig();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to delete configurations";
        setError(errorMessage);
        throw error; // Re-throw to allow UI to handle
      }
    },
    [selectedClient, selectedPath, executeMcpOperation, loadConfig],
  );

  useEffect(() => {
    console.log("useEffect in useMcpConfig triggered");
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    isLoading,
    error,
    updateConfig,
    deleteConfig,
    loadConfig,
    disabledServers,
    enableServer,
    disableServer,
    syncConfig,
    batchDeleteServers,
  };
}
