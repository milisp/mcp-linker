import { ServerConfig, ServerType, StdioServerConfig } from "@/types";
import { useEffect, useState } from "react";

interface UseServerConfigProps {
  isOpen: boolean;
  currentServer: ServerType | null;
  clearDraft: () => void;
}

// Registry names are reverse-DNS (io.github.user/weather); clients expect a
// short key, so use the last path segment.
function defaultServerName(server: ServerType): string {
  return server.id.split("/").pop() || server.name;
}

export const useServerConfigDialog = ({
  isOpen,
  currentServer,
  clearDraft,
}: UseServerConfigProps) => {
  const [serverName, setServerName] = useState<string>("");
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [curIndex, setCurIndex] = useState<number>(0);
  const [configs, setConfigs] = useState<ServerConfig[] | null>(null);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !currentServer) return;

    setServerName(defaultServerName(currentServer));

    const configArray = currentServer.configs ?? [];
    if (configArray.length === 0) {
      createDefaultConfig();
      clearDraft();
      return;
    }

    setConfigs(configArray);

    const defaultConfig =
      configArray.find(
        (cfg) =>
          cfg && (("command" in cfg && cfg.command) || ("url" in cfg && cfg.url)),
      ) || configArray[0];

    setConfig(defaultConfig);
    setCurIndex(configArray.indexOf(defaultConfig));

    if (defaultConfig && "command" in defaultConfig) {
      const env = (defaultConfig as StdioServerConfig).env || {};
      setEnvValues(
        Object.fromEntries(Object.keys(env).map((key) => [key, env[key] || ""])),
      );
    } else {
      setEnvValues({});
    }

    clearDraft();
  }, [isOpen, currentServer]);

  const createDefaultConfig = () => {
    const defaultStdioConfig: StdioServerConfig = {
      type: "stdio",
      command: "",
      args: [],
      env: {},
    };

    setConfigs([defaultStdioConfig]);
    setConfig(defaultStdioConfig);
    setCurIndex(0);
    setEnvValues({});
  };

  return {
    serverName,
    setServerName,
    config,
    setConfig,
    curIndex,
    setCurIndex,
    configs,
    setConfigs,
    envValues,
    setEnvValues,
    createDefaultConfig,
  };
};
