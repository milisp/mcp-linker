// Client metadata comes from Rust (src-tauri/src/clients.rs), the single source of truth.
// It is loaded once before the app renders, so lookups here are synchronous.
import type { Tier } from "@/lib/license";
import { invoke } from "@tauri-apps/api/core";

export type ClientInfo = {
  id: string;
  label: string;
  url: string;
  storage: "json" | "codexToml" | "claudeCode";
  /** The JSON object that holds the servers. */
  serversKey: string;
  /** user: fixed file · userOrProject: or a project's `projectFile` · file: user picks the file · claudeCode: project + scope. */
  location: "user" | "userOrProject" | "file" | "claudeCode";
  projectFile: string | null;
  /** flag: `"disabled": true` · stash: parked under `__disabled` · list: names in the client's settings.json (Copilot CLI) · native: the client's own mechanism. */
  disable: "flag" | "stash" | "list" | "native";
  /** The license tier needed to change this client's config. */
  tier: Tier;
};

let clients: ClientInfo[] = [];

export async function loadClients() {
  clients = await invoke<ClientInfo[]>("list_clients");
}

/** For tests. */
export function setClients(next: ClientInfo[]) {
  clients = next;
}

export const getClients = () => clients;
export const getClient = (id: string) => clients.find(client => client.id === id);
export const clientLabel = (id: string) => getClient(id)?.label ?? id;

/** A project folder can be chosen (Cursor, VS Code). */
export const hasProjectConfig = (id: string) => getClient(id)?.location === "userOrProject";
/** There is no default location; the user must pick the config file (custom). */
export const requiresConfigFile = (id: string) => getClient(id)?.location === "file";
/** A path can or must be chosen. */
export const takesPath = (id: string) => hasProjectConfig(id) || requiresConfigFile(id);
/** Disabled entries stay in the server list with `"disabled": true` (Cline, mcphub). */
export const usesDisabledFlag = (id: string) => getClient(id)?.disable === "flag";
