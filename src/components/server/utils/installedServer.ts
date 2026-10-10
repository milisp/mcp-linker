import { invoke } from "@tauri-apps/api/core";
import type { ServerType } from "@/types";
import { normalizeServerConfig } from "./normalizeServerConfig";
import { useCCProjectStore, type ClaudeCodeScope } from "@/stores/ccProject";

export const installedServerPath = (name: string, tab: "connection" | "tools" = "tools") =>
  `/servers/${encodeURIComponent(`installed:${name}`)}?tab=${tab}`;

export async function fetchInstalledServer(name: string, client: string, path: string | null, project: string | null, scope: ClaudeCodeScope = useCCProjectStore.getState().selectedScope): Promise<ServerType> {
  let active: Record<string, Record<string, unknown>>;
  let disabled: Record<string, Record<string, unknown>>;
  if (client === "claude_code") {
    if (scope !== "user" && !project) throw new Error("Select a Claude Code project first.");
    const [list, inactive] = await Promise.all([
      invoke<Record<string, unknown>[]>("claude_mcp_list", { workingDir: project || "", scope }),
      scope === "local" ? invoke<Record<string, Record<string, unknown>>>("claude_list_disabled", { workingDir: project, scope }) : Promise.resolve({}),
    ]);
    active = Object.fromEntries(list.filter(entry => typeof entry.name === "string").map(entry => [entry.name as string, entry]));
    disabled = inactive;
  } else {
    const [data, inactive] = await Promise.all([
      invoke<{ mcpServers?: Record<string, Record<string, unknown>> }>("read_json_file", { clientName: client, path: path || undefined }),
      invoke<Record<string, Record<string, unknown>>>("list_disabled_servers", { clientName: client, path: path || undefined }),
    ]);
    active = data.mcpServers ?? {};
    disabled = inactive;
  }
  const value = disabled?.[name] ?? active[name];
  if (!value) throw new Error(`Server '${name}' is not installed in the selected client.`);
  if (value.type === "encrypted") throw new Error("Decrypt this server in Manage before inspecting its tools.");
  const config = normalizeServerConfig(value);
  if (!config) throw new Error("The installed connection configuration is invalid.");
  return {
    id: `installed:${name}`, name, description: "Installed server connection and tools", source: "",
    isOfficial: false, isFavorited: false, configs: [config],
    installed: { name, disabled: !!disabled?.[name] || value.disabled === true || value.enabled === false },
  };
}
