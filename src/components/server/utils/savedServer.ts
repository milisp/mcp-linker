import { clientWrite } from "@/lib/claude";
import type { EncryptedServerConfig, ServerConfig, ServerType } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { normalizeServerConfig } from "./normalizeServerConfig";

/** Saved configurations live in MCP Linker's own config, under the "mcplinker" client. */
export function savedServer(name: string, value: Record<string, unknown>): ServerType {
  const config: ServerConfig | null = value.type === "encrypted" ? value as unknown as EncryptedServerConfig : normalizeServerConfig(value);
  const summary = config && "command" in config ? [config.command, ...config.args].join(" ") : config && "url" in config ? config.url : "";
  return {
    id: `saved:${name}`, name, description: summary, source: "saved",
    isOfficial: false, isFavorited: false, configs: config ? [config] : [],
  };
}

export async function fetchSavedServers(): Promise<ServerType[]> {
  const data = await invoke<{ mcpServers?: Record<string, Record<string, unknown>> }>("read_json_file", { clientName: "mcplinker", path: "" });
  return Object.entries(data.mcpServers ?? {}).map(([name, value]) => savedServer(name, value));
}

export function removeSavedServer(name: string) {
  return clientWrite("remove_mcp_server", { clientName: "mcplinker", path: "", serverName: name });
}
