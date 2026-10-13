import type { ServerConfig } from "@/types";
import { normalizeServerConfig } from "./normalizeServerConfig";

export type ImportedServer = { name: string; config: ServerConfig };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isServer = (value: Record<string, unknown>) => "command" in value || "url" in value;

/**
 * Server configs in a JSON snippet, as READMEs and clients write them:
 * `{ mcpServers: { name: config } }`, VS Code's `{ servers: … }`,
 * `{ name: config }`, or a bare config without a name.
 */
export function findServerConfigs(json: unknown): ImportedServer[] {
  if (!isRecord(json)) return [];
  if (isServer(json)) {
    const config = normalizeServerConfig(json);
    return config ? [{ name: "", config }] : [];
  }
  const map = isRecord(json.mcpServers) ? json.mcpServers : isRecord(json.servers) ? json.servers : json;
  return Object.entries(map).flatMap(([name, value]) => {
    const config = isRecord(value) && isServer(value) ? normalizeServerConfig(value) : null;
    return config ? [{ name, config }] : [];
  });
}
