import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServerConfig } from "@/types";
import capitalizeFirstLetter from "@/utils/title";
import { invoke } from "@tauri-apps/api/core";
import { forwardRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ArgsTextarea } from "./ArgsTextarea";
import { CommandInput } from "./CommandInput";
import { EnvEditor } from "./EnvEditor";
import { HeaderEditor } from "./HeaderEditor";
import { ServerNameInput } from "./ServerNameInput";

interface ServerTemplateDialogProps {
  isOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  selectedClient: string;
  selectedPath: string;
}

export const ServerTemplateDialog = forwardRef<
  HTMLDivElement,
  ServerTemplateDialogProps
>(({ isOpen, setIsDialogOpen, selectedClient, selectedPath }) => {
  const [serverName, setServerName] = useState<string>("");
  const [serverType, setServerType] = useState<string>("stdio");

  const configTemplate = {
    command: "",
    args: [],
    env: {},
    headers: {},
    url: 'http://localhost:8000/sse'
  };

  const [config, setConfig] = useState<ServerConfig>(configTemplate);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [headerValues, setHeaderValues] = useState<Record<string, string>>({});
  const { t } = useTranslation();

  const commands = ["uvx", "bunx", "npx", "docker"];

  const exampleTemplates: Record<string, ServerConfig> = {
    "brave-search": configTemplate,
  };

  // Initialize server data
  useEffect(() => {
    if (isOpen && selectedClient) {
      const template = exampleTemplates[selectedClient];
      if (template) {
        setServerName(selectedClient);
        setConfig(template);
      }
    }
  }, [isOpen, selectedClient]);

  const handleArgsChange = (value: string) => {
    const newArgs = value.split(" ").filter((arg) => arg !== "");
    if (JSON.stringify(newArgs) !== JSON.stringify(config.args)) {
      setConfig({ ...config, args: newArgs });
    }
  };

  const handleCommandChange = (value: string) => {
    setConfig({ ...config, command: value });
  };
  const handleUrl = (value: string) => {
    setConfig({ ...config, url: value });
  };

  const handleEnvChange = (key: string, value: string) => {
    setConfig({ ...config, env: { ...config.env, [key]: value } });
  };

  const handletHeaderChange = (key: string, value: string) => {
    setConfig({ ...config, headers: { ...config.headers, [key]: value } });
  };

  const handleSubmit = async () => {
    console.log(config);
    try {
      await invoke("add_mcp_server", {
        clientName: selectedClient,
        path: selectedPath || undefined,
        serverName: serverName,
        serverConfig: config,
      });
      toast.success("Configuration updated successfully");
    } catch (error) {
      console.error(`Error updating config: ${error}`);
      toast.error("Failed to update configuration");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="overflow-y-auto max-h-[90vh] w-[90vw] max-w-3xl bg-background dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="dark:text-white">config</DialogTitle>
          <DialogDescription>server config</DialogDescription>
        </DialogHeader>

        <ServerNameInput serverName={serverName} onChange={setServerName} />

        <Select defaultValue={serverType} onValueChange={setServerType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a server type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="stdio">Stdio</SelectItem>
              <SelectItem value="sse">SSE</SelectItem>
              <SelectItem value="http">Http</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {serverType === "stdio" && (
          <div>
            <CommandInput
              command={config?.command || ""}
              onChange={handleCommandChange}
            />

            <div className="flex gap-2 flex-wrap">
              {commands.map((command) => (
                <Button
                  key={command}
                  variant="outline"
                  onClick={() => handleCommandChange(command)}
                >
                  {command}
                </Button>
              ))}
            </div>

            <ArgsTextarea
              args={config?.args || []}
              onChange={handleArgsChange}
            />

            <EnvEditor
              env={config?.env || {}}
              envValues={envValues}
              setEnvValues={setEnvValues}
              onEnvChange={handleEnvChange}
              isEdit={true}
            />
          </div>
        )}

        {(serverType === "sse" || serverType === "http") && (
          <div>
            <div className="grid gap-2">
              <Label className="text-foreground dark:text-gray-200">
                Url
              </Label>
              <Input
                value={config?.url || ""}
                onChange={(e) => handleUrl(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-500 dark:text-white"
              />
            </div>
            <HeaderEditor
              header={config?.headers || {}}
              headerValues={headerValues}
              setHeaderValues={setHeaderValues}
              onHeaderChange={handletHeaderChange}
            />
          </div>
        )}

        <Button
          onClick={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {t("addTo")} {capitalizeFirstLetter(selectedClient)}
        </Button>
      </DialogContent>
    </Dialog>
  );
});

ServerTemplateDialog.displayName = "ServerTemplateDialog";
