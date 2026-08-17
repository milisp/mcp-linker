// ServerConfigDialog.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ServerConfig, ServerType, SseConfig } from "@/types";
import { forwardRef, useEffect } from "react";
import { toast } from "sonner";

import { useClientPathStore } from "@/stores/clientPathStore";
import { ServerConfigForm } from "../form/ServerConfigForm";
import {
  useLocalDraft,
  useSaveServerConfig,
  useServerConfigDialog,
} from "../hooks";
import { ServerConfigDialogHeader } from "./ServerConfigDialogHeader";

interface ServerConfigDialogProps {
  isOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  currentServer: ServerType;
}

export const ServerConfigDialog = forwardRef<
  HTMLDivElement,
  ServerConfigDialogProps
>(({ isOpen, setIsDialogOpen, currentServer }, _ref) => {
  const { selectedClient, selectedPath } = useClientPathStore();
  const { saveServerConfig } = useSaveServerConfig();

  const { clearDraft } = useLocalDraft();

  const {
    serverName,
    setServerName,
    config,
    setConfig,
    curIndex,
    setCurIndex,
    configs,
    envValues,
    setEnvValues,
  } = useServerConfigDialog({
    isOpen,
    currentServer,
    clearDraft: () => clearDraft(),
  });

  // Update draftProps whenever relevant state changes
  useEffect(() => {
    clearDraft({
      serverName,
      setServerName,
      config,
      setConfig,
      envValues,
      setEnvValues,
      isOpen,
    });
  }, [serverName, config, envValues, isOpen]);

  const handleArgsChange = (value: string) => {
    if (config && "command" in config) {
      // Only update if the value has actually changed
      const newArgs = value.split(" ").filter((arg) => arg !== "");
      if (JSON.stringify(newArgs) !== JSON.stringify(config.args)) {
        setConfig({ ...config, args: newArgs });
      }
    }
  };

  const handleCommandChange = (value: string) => {
    if (config && "command" in config) {
      setConfig({ ...config, command: value });
    }
  };

  const handleEnvChange = (key: string, value: string) => {
    if (config && "command" in config) {
      setConfig({
        ...config,
        env: { ...(config.env || {}), [key]: value },
      });
    }
  };

  const handleSseConfigChange = (newConfig: SseConfig) => {
    setConfig(newConfig);
  };

  const handleConfigChange = (c: ServerConfig, index: number) => {
    setConfig(c);
    setCurIndex(index);
  };

  const handleSubmit = async () => {
    if (
      !selectedPath &&
      (selectedClient === "custom" || selectedClient === "vscode")
    ) {
      toast.error("Path is required");
      return;
    }
    const serverConfig = {
      selectedClient,
      selectedPath: selectedPath || "",
      currentServer,
      serverName,
      config,
      setIsDialogOpen,
    };
    console.log(serverConfig);
    await saveServerConfig(serverConfig);
    clearDraft(); // Clear the draft after successful save
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="overflow-y-auto max-h-[90vh] w-[90vw] max-w-3xl">
        <ServerConfigDialogHeader />

        {/* Main server config form extracted to a reusable component */}
        <ServerConfigForm
          serverName={serverName}
          setServerName={setServerName}
          // Ensure configs is always an array, never null
          configs={configs ?? []}
          curIndex={curIndex}
          onConfigChange={handleConfigChange}
          // Ensure config is never null, fallback to an empty object or suitable default if needed
          config={config ?? ({} as ServerConfig)}
          envValues={envValues}
          setEnvValues={setEnvValues}
          onCommandChange={handleCommandChange}
          onArgsChange={handleArgsChange}
          onEnvChange={handleEnvChange}
          onSseConfigChange={handleSseConfigChange}
          onSubmit={handleSubmit}
          selectedClient={selectedClient}
        />
      </DialogContent>
    </Dialog>
  );
});

ServerConfigDialog.displayName = "ServerConfigDialog";
