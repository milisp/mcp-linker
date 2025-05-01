// ServerConfigDialog.tsx
import { useState, useEffect, forwardRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { needspathClient } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ServerType, ServerConfig } from "@/types";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface ServerConfigDialogProps {
  isOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  currentServer: ServerType;
  selectedApp: string;
  selectedPath: string;
  mcpServers: any;
}

export const ServerConfigDialog = forwardRef<
  HTMLDivElement,
  ServerConfigDialogProps
>(
  ({
    isOpen,
    setIsDialogOpen,
    currentServer,
    selectedApp,
    selectedPath,
    mcpServers,
  }) => {
    const LOCAL_STORAGE_KEY = "server_config_dialog_draft";

    const [serverName, setServerName] = useState<string>("");
    const [config, setConfig] = useState<ServerConfig | null>(null);
    const [curIndex, setCurIndex] = useState<number>(0);
    const [configs, setConfigs] = useState<ServerConfig[] | null>(null);
    const { t } = useTranslation();

    // Add this near the other useState declarations
    const [envValues, setEnvValues] = useState<Record<string, string>>({});

    // Update useEffect to initialize envValues when config changes
    useEffect(() => {
      if (currentServer) {
        setServerName(currentServer.name);
        setConfigs(currentServer.configs);

        if (currentServer.configs?.length > 0) {
          setConfig(currentServer.configs[0]);
          setCurIndex(0);
        }
        // Initialize envValues with empty strings
        if (currentServer.configs?.[0]?.env) {
          const initialEnvValues = Object.keys(
            currentServer.configs[0].env,
          ).reduce(
            (acc, key) => {
              acc[key] = "";
              return acc;
            },
            {} as Record<string, string>,
          );
          setEnvValues(initialEnvValues);
        }

        // Clear saved draft when server changes
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }, [currentServer]);

    // Load saved draft when dialog opens
    useEffect(() => {
      if (isOpen) {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.serverName) setServerName(parsed.serverName);
            if (parsed.config) setConfig(parsed.config);
            if (parsed.envValues) setEnvValues(parsed.envValues);
          } catch {
            // ignore parse errors
          }
        }
      }
    }, [isOpen]);

    // Save draft to localStorage on changes
    useEffect(() => {
      if (serverName && config) {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({ serverName, config, envValues }),
        );
      }
    }, [serverName, config, envValues]);

    function handleServerNameChange(value: string) {
      setServerName(value);
    }

    async function updateConfig(selectedServer: string, value: ServerConfig) {
      try {
        const server = {
          appName: selectedApp,
          path: selectedPath,
          serverName: selectedServer,
          serverConfig: value,
        };
        await invoke("add_mcp_server", server);
        console.log("add server", new Date());
      } catch (error) {
        console.error(error);
      }
    }

    const handleSubmit = async () => {
      if (needspathClient.includes(selectedApp) && !selectedPath) {
        toast.error("Path is required");
        return;
      }
      if (!currentServer) {
        toast.error("Please select a server");
        return;
      }

      const client = mcpServers.find(
        (s: ServerType) => s.source === currentServer.source,
      );
      if (!client) {
        toast.error("Client not found");
        return;
      }

      if (client && config) {
        try {
          await updateConfig(client.name, config);
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
          setIsDialogOpen(false);
          toast.success("Configuration updated successfully");
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } catch (error) {
          console.error("Failed to update config:", error);
          toast.error("Failed to update configuration");
        }
      }
    };

    const handleArgsChange = (value: string) => {
      if (config) {
        // Only update if the value has actually changed
        const newArgs = value.split(" ").filter((arg) => arg !== "");
        if (JSON.stringify(newArgs) !== JSON.stringify(config.args)) {
          setConfig({ ...config, args: newArgs });
        }
      }
    };

    const handleCommandChange = (value: string) => {
      if (config) {
        setConfig({ ...config, command: value });
      }
    };

    const handleEnvChange = (key: string, value: string) => {
      if (config) {
        setConfig({ ...config, env: { ...config.env, [key]: value } });
      }
    };

    function changeCurrentConfig(c: ServerConfig, index: number) {
      setConfig(c);
      setCurIndex(index);
    }
    return (
      <Dialog open={isOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="overflow-y-auto max-h-[90vh] w-[90vw] max-w-3xl bg-background dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">config</DialogTitle>
            <DialogDescription>server config</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label className="text-foreground dark:text-gray-200">
              Server Name
            </Label>
            <Input
              value={serverName || ""}
              onChange={(e) => handleServerNameChange(e.target.value)}
              className="dark:bg-gray-800 dark:border-gray-500 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            {currentServer &&
              configs &&
              configs.map((c, index) => (
                <Button
                  key={`${c.command}-${index}-${Math.random()}`}
                  onClick={() => changeCurrentConfig(c, index)}
                  variant={`${curIndex == index ? "default" : "outline"}`}
                  aria-label={`Select ${c.command} configuration`}
                >
                  {c.command}
                </Button>
              ))}
          </div>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-foreground dark:text-gray-200">
                Command
              </Label>
              <Input
                value={config?.command || ""}
                onChange={(e) => handleCommandChange(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-500 dark:text-white"
              />
            </div>
            {config && config.args && (
              <div className="grid gap-2">
                <Label className="text-foreground dark:text-gray-200">
                  args
                </Label>
                <Textarea
                  value={config.args.join(" ")}
                  onChange={(e) => handleArgsChange(e.target.value)}
                  className="dark:bg-gray-800 dark:border-gray-500 dark:text-white"
                />
              </div>
            )}
            {config && config.env && (
              <div className="grid gap-2">
                <h2 className="text-foreground dark:text-gray-200">env</h2>
                <div className="space-y-2">
                  {Object.entries(config.env).map(([key, value], envIndex) => (
                    <div
                      key={envIndex}
                      className="grid grid-cols-2 items-center gap-2"
                    >
                      <Label className="col-span-1 text-foreground dark:text-gray-200">
                        {key}
                      </Label>
                      <Input
                        className="col-span-3 dark:bg-gray-800 dark:border-gray-500 dark:text-white"
                        value={envValues[key] || ""}
                        placeholder={value}
                        onChange={(e) => {
                          setEnvValues((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }));
                          handleEnvChange(key, e.target.value || value);
                        }}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button
            onClick={(e) => {
              e.preventDefault(); // Prevent default form submission behavior
              handleSubmit();
            }}
          >
            {t("addTo")} {selectedApp}
          </Button>
        </DialogContent>
      </Dialog>
    );
  },
);

ServerConfigDialog.displayName = "ServerConfigDialog";
