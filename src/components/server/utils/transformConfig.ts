import type { ServerConfig } from "@/types";

export const transformConfig = (
  serverType: string,
  config: ServerConfig,
): ServerConfig => {
  let finalConfig: ServerConfig;

  if (serverType === "stdio" && "command" in config && "args" in config) {
    finalConfig = {
      type: "stdio",
      command: config.command,
      args: config.args,
      env: config.env || {},
    };
  } else if (
    (serverType === "sse" || serverType === "http") &&
    "url" in config
  ) {
    finalConfig = {
      type: serverType as "http" | "sse",
      url: config.url,
      headers: config.headers || {},
    };
  } else {
    throw new Error("Invalid config structure for selected server type.");
  }

  return finalConfig;
};
