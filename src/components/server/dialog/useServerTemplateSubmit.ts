import { useMcpRefresh } from "@/contexts/McpRefreshContext";
import { addToClaudeCode, clientWrite, LicenseRequiredError } from "@/lib/claude";
import { toast } from "sonner";
import { transformConfig } from "../utils/transformConfig";

// Custom hook to provide submit handlers for server template dialog
export function useServerTemplateSubmit({
  serverName,
  setIsDialogOpen,
  config,
  serverType,
  selectedClient,
  selectedPath,
}: {
  serverName: string;
  setIsDialogOpen: (open: boolean) => void;
  config: any;
  serverType: string;
  selectedClient: string;
  selectedPath: string | undefined;
}) {
  const { refreshServerList } = useMcpRefresh();

  // Handle submit (add to local config)
  const handleSubmit = async () => {
    try {
      const finalConfig = transformConfig(serverType, config);
      if (selectedClient === "claude_code") await addToClaudeCode(serverName, finalConfig as unknown as Record<string, unknown>);
      else await clientWrite("add_mcp_server", {
        clientName: selectedClient,
        path: selectedPath || undefined,
        serverName: serverName,
        serverConfig: finalConfig,
      });
      
      // Refresh the server list automatically
      refreshServerList(selectedClient, selectedPath);
      
      toast.success("Configuration updated successfully");
      setIsDialogOpen(false);
    } catch (error) {
      console.error(`Error updating config: ${error}`);
      if (!(error instanceof LicenseRequiredError)) toast.error(`Failed to update configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return { handleSubmit };
}
