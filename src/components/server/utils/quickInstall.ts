import type { ServerConfig, ServerType } from "@/types";

const UNRESOLVED_INPUT = /<[^>]+>|\{[^}]+\}|\b(?:YOUR_|REPLACE_|CHANGE_ME|TODO)/i;

function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !UNRESOLVED_INPUT.test(value);
}

/** Only a single, complete configuration can bypass the configuration editor. */
export function quickInstallConfig(server: ServerType): ServerConfig | null {
  if (server.requiresConfiguration || server.configs?.length !== 1) return null;
  const config = server.configs[0];
  if (config.type === "encrypted") return null;
  if (config.type === "stdio") {
    if (!hasValue(config.command) || !config.args.every(hasValue)) return null;
    if (!Object.values(config.env ?? {}).every(hasValue)) return null;
  } else {
    if (!hasValue(config.url) || !Object.values(config.headers ?? {}).every(hasValue)) return null;
    try {
      if (!["http:", "https:"].includes(new URL(config.url).protocol)) return null;
    } catch {
      return null;
    }
  }
  return config;
}

export function serverTransportLabels(server: ServerType): string[] {
  const configs = server.configs ?? [];
  const labels = [];
  if (configs.some(config => config.type === "stdio")) labels.push("Local");
  if (configs.some(config => config.type === "http" || config.type === "sse")) labels.push("Remote");
  return labels.length ? labels : ["Setup"];
}
