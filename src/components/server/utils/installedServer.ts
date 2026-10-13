import { invoke } from "@tauri-apps/api/core";
import type { ServerType } from "@/types";
import { normalizeServerConfig } from "./normalizeServerConfig";
import { claudeWrite, clientWrite } from "@/lib/claude";
import { useCCProjectStore, type ClaudeCodeScope } from "@/stores/ccProject";
import { useClientPathStore } from "@/stores/clientPathStore";

export const installedServerPath = (name: string, tab: "connection" | "tools" = "tools") =>
  `/servers/${encodeURIComponent(`installed:${name}`)}?tab=${tab}`;

type ServerMap = Record<string, Record<string, unknown>>;

/** Active and disabled servers of one client, project and scope. */
async function readInstalled(client: string, path: string | null, project: string | null, scope: ClaudeCodeScope): Promise<{ active: ServerMap; disabled: ServerMap }> {
  if (client === "claude_code") {
    if (scope !== "user" && !project) throw new Error("Select a Claude Code project first.");
    const [list, disabled] = await Promise.all([
      invoke<Record<string, unknown>[]>("claude_mcp_list", { workingDir: project || "", scope }),
      scope === "local" ? invoke<ServerMap>("claude_list_disabled", { workingDir: project, scope }) : Promise.resolve({}),
    ]);
    return { active: Object.fromEntries(list.filter(entry => typeof entry.name === "string").map(entry => [entry.name as string, entry])), disabled: disabled ?? {} };
  }
  const [data, disabled] = await Promise.all([
    invoke<{ mcpServers?: ServerMap }>("read_json_file", { clientName: client, path: path || undefined }),
    invoke<ServerMap>("list_disabled_servers", { clientName: client, path: path || undefined }),
  ]);
  return { active: data.mcpServers ?? {}, disabled: disabled ?? {} };
}

/** Names of every server installed in the target, enabled or not. */
export async function fetchInstalledNames(client: string, path: string | null, project: string | null, scope: ClaudeCodeScope): Promise<Set<string>> {
  const { active, disabled } = await readInstalled(client, path, project, scope);
  return new Set([...Object.keys(active), ...Object.keys(disabled)]);
}

/** Removes a server from the selected target; a disabled one is enabled first so it can be removed. */
export async function uninstallServer(name: string) {
  const { selectedClient: client, selectedPath: path } = useClientPathStore.getState();
  const { selectedProject: project, selectedScope: scope } = useCCProjectStore.getState();
  const disabled = name in (await readInstalled(client, path, project, scope)).disabled;
  if (client === "claude_code") {
    if (disabled) await claudeWrite("claude_enable_server", { workingDir: project, scope, name });
    await claudeWrite("claude_mcp_remove", { name, workingDir: project || "", scope });
  } else {
    if (disabled) await clientWrite("enable_mcp_server", { clientName: client, path: path || undefined, serverName: name });
    await clientWrite("remove_mcp_server", { clientName: client, path: path || undefined, serverName: name });
  }
}

export async function fetchInstalledServer(name: string, client: string, path: string | null, project: string | null, scope: ClaudeCodeScope = useCCProjectStore.getState().selectedScope): Promise<ServerType> {
  const { active, disabled } = await readInstalled(client, path, project, scope);
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
