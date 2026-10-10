import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useClientPathStore } from "@/stores";
import { useViewStore } from "@/stores/viewStore";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function getConfigObj(editableConfig: string, serverName: string) {
  if (!editableConfig) return null;
  try {
    const obj = JSON.parse(editableConfig);
    if (obj && typeof obj === "object") {
      if (serverName && obj[serverName]) return obj[serverName];
      const firstKey = Object.keys(obj)[0];
      if (firstKey) return obj[firstKey];
    }
  } catch (e) {
    console.error("Invalid JSON in config:", e);
  }
  return null;
}

function decodeAndFormatConfig(config: string): string {
  try {
    const decodedConfig = atob(config);
    const parsed = JSON.parse(decodedConfig);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return atob(config);
  }
}

export function InstallAppPage() {
  const { search } = useViewStore();
  const serverName = search.name || "blender-map";
  const config =
    search.config ||
    "eyJibGVuZGVyLW1jcCI6eyJjb21tYW5kIjoidXZ4IGJsZW5kZXItbWNwIn19";
  const repo = search.repo;
  const { selectedClient, selectedPath } = useClientPathStore();

  const [editableConfig, setEditableConfig] = useState("");

  // Initialize config on component mount
  useEffect(() => {
    if (config) setEditableConfig(decodeAndFormatConfig(config));
  }, [config]);

  const addServer = useCallback(async () => {
    if (!selectedClient || !serverName) {
      toast.error("Missing required client or server name");
      return;
    }

    const serverConfig = getConfigObj(editableConfig, serverName);
    if (!serverConfig) {
      // Show detailed debug info
      try {
        const obj = JSON.parse(editableConfig);
        toast.error(
          `No valid config found. serverName: ${serverName}, objKeys: ${Object.keys(obj).join(", ")}`,
        );
      } catch (e) {}
      return;
    }

    try {
      await invoke("add_mcp_server", {
        clientName: selectedClient,
        path: selectedPath || undefined,
        serverName: serverName,
        serverConfig: serverConfig,
      });
      toast.success(`Successfully added server ${serverName}`);
    } catch (error) {
      console.error("Failed to add server:", error);
      toast.error(`Failed to add server: ${JSON.stringify(error)}`);
    }
  }, [selectedClient, selectedPath, serverName, editableConfig]);

  const handleConfigChange = useCallback((value: string) => {
    setEditableConfig(value);
  }, []);

  // SECURITY: do not auto-submit from a deep link. The `autoSubmit` query
  // param used to trigger addServer() on mount with zero user confirmation,
  // letting any webpage silently write an arbitrary command into the user's
  // MCP client config. Adding a server must always be an explicit click.

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Add Server</h1>
        {serverName && (
          <span className="text-muted-foreground">
            {serverName} {repo && `(${repo})`}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="config" className="text-sm font-medium">
          MCP Server Configuration
        </label>
        <Textarea
          id="config"
          value={editableConfig}
          onChange={(e) => handleConfigChange(e.target.value)}
          placeholder="Enter server configuration..."
          className="min-h-[200px] font-mono"
        />
      </div>

      <Button
        onClick={addServer}
        disabled={!selectedClient || !serverName || !editableConfig}
        className="w-full"
      >
        {`Add to ${selectedClient}`}
      </Button>
    </div>
  );
}
