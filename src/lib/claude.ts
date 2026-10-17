import { useCCProjectStore } from "@/stores/ccProject";
import { requireClient } from "@/stores/license";
import { type InvokeArgs, invoke } from "@tauri-apps/api/core";

/** Thrown after the upgrade dialog has been shown; callers need not toast it. */
export class LicenseRequiredError extends Error {}

type ClaudeWriteCommand =
  | "claude_mcp_add"
  | "claude_mcp_remove"
  | "claude_enable_server"
  | "claude_disable_server"
  | "claude_update_disabled";

/** Every Claude Code change goes through here. Claude Code is a paid client. */
export function claudeWrite<T = unknown>(command: ClaudeWriteCommand, args?: InvokeArgs): Promise<T> {
  if (!requireClient("claude_code")) {
    return Promise.reject(new LicenseRequiredError("A license is required for this Claude Code change."));
  }
  return invoke<T>(command, args);
}

type ClientWriteCommand =
  | "add_mcp_server"
  | "update_mcp_server"
  | "remove_mcp_server"
  | "enable_mcp_server"
  | "disable_mcp_server"
  | "update_disabled_mcp_server";

/** Writes for the JSON/TOML clients; only the free clients work without a license. */
export function clientWrite<T = unknown>(command: ClientWriteCommand, args: InvokeArgs & { clientName: string }): Promise<T> {
  if (args.clientName === "claude_code") {
    return Promise.reject(new Error("Claude Code servers must be written with the Claude Code commands."));
  }
  if (!requireClient(args.clientName)) {
    return Promise.reject(new LicenseRequiredError(`A license is required to change ${args.clientName} servers.`));
  }
  return invoke<T>(command, args);
}

/** Maps a client config to Claude Code's add request. */
export function toClaudeRequest(name: string, value: Record<string, unknown>) {
  const url = value.url ?? value.serverUrl ?? value.httpUrl;
  if (value.command) {
    return { name, type: "stdio", command: value.command, args: value.args ?? [], env: value.env };
  }
  if (url) {
    // Rust normalizes streamable-http spellings to Claude Code's "http".
    return { name, type: value.type ?? "http", url, headers: value.headers };
  }
  throw new Error("Unsupported config for Claude Code");
}

/** Adds a server to the Claude Code project and scope chosen in the header. */
export function addToClaudeCode(name: string, value: Record<string, unknown>) {
  const { selectedProject, selectedScope } = useCCProjectStore.getState();
  if (selectedScope !== "user" && !selectedProject) {
    return Promise.reject(new Error("Select a Claude Code project first."));
  }
  return claudeWrite("claude_mcp_add", {
    request: toClaudeRequest(name, value),
    workingDir: selectedProject ?? "",
    scope: selectedScope,
  });
}
