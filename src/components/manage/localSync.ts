// Pure helpers behind LocalSyncPanel, kept free of React and Tauri so they can be unit tested.
import type { ClaudeCodeScope } from "@/stores/ccProject";

export type ServerMap = Record<string, Record<string, any>>;
export type SourceOption = { value: string; label: string };
export type Staged = { toCopy: Set<string>; toDelete: Set<string> };

export const basename = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() || path;
export const SCOPE_LABEL: Record<ClaudeCodeScope, string> = { local: "Local", project: "Project", user: "User" };

// Claude Code sources are a project and scope, encoded as "claude_code|<scope>|<dir>".
export const ccSource = (scope: ClaudeCodeScope, dir: string) => `claude_code|${scope}|${scope === "user" ? "" : dir}`;
export const isCCSource = (value: string) => value.startsWith("claude_code|");
export const parseCCSource = (value: string) => {
  const [, scope, ...dir] = value.split("|");
  return { scope: scope as ClaudeCodeScope, dir: dir.join("|") };
};
/** The client id behind a side's value ("claude_code|…" is Claude Code). */
export const clientIdOf = (value: string) => (isCCSource(value) ? "claude_code" : value);
export const ccLabel = (scope: ClaudeCodeScope, dir: string) =>
  scope === "user" ? "Claude Code · User" : `Claude Code · ${basename(dir)} · ${SCOPE_LABEL[scope]}`;

/** The option value the current target would have, so it can be left out of the sources. */
export const targetValueOf = (client: string, scope: ClaudeCodeScope, project: string | null) =>
  client === "claude_code" ? ccSource(scope, project ?? "") : client;

/** A server in client-neutral form; client-only keys (autoApprove, timeouts, …) do not survive. */
export type PortableServer =
  | { transport: "stdio"; command: string; args: string[]; env?: Record<string, string>; cwd?: string }
  | { transport: "http" | "sse"; url: string; headers?: Record<string, string> };

const stringMap = (value: unknown): Record<string, string> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]);
  return entries.length ? Object.fromEntries(entries) : undefined;
};

// Claude Desktop only runs stdio servers, so remote ones are bridged through mcp-remote.
// Header values go through env vars, as mcp-remote's README recommends (spaces in args break on Windows).
const MCP_REMOTE = /^mcp-remote(@[\w.-]+)?$/;
const HEADER_ENV = "MCP_REMOTE_HEADER_";

function unwrapMcpRemote(command: string, args: string[], env: Record<string, string> = {}): PortableServer | undefined {
  if (!/(^|[\\/])npx(\.cmd)?$/.test(command)) return undefined;
  const rest = args.filter(arg => arg !== "-y" && arg !== "--yes");
  if (!MCP_REMOTE.test(rest[0] ?? "") || !/^https?:\/\//.test(rest[1] ?? "")) return undefined;
  let transport: "http" | "sse" = "http";
  const headers: Record<string, string> = {};
  for (let i = 2; i < rest.length; i += 2) {
    const [flag, value] = [rest[i], rest[i + 1]];
    if (flag === "--transport" && (value === "sse-only" || value === "http-only")) {
      transport = value === "sse-only" ? "sse" : "http";
    } else if (flag === "--header" && value?.includes(":")) {
      const at = value.indexOf(":");
      headers[value.slice(0, at).trim()] = value.slice(at + 1).trim().replace(/\$\{(\w+)\}/g, (_, name) => env[name] ?? "");
    } else {
      return undefined; // An option we can't carry over; keep the bridge as a plain stdio server.
    }
  }
  return { transport, url: rest[1], ...(Object.keys(headers).length && { headers }) };
}

/** Reads any client's server entry (Cursor, VS Code, Cline, Codex, Claude Code, Claude Desktop, …). */
export function toPortable(config: Record<string, any>): PortableServer {
  if (typeof config.command === "string" && config.command) {
    const args = Array.isArray(config.args) ? config.args.map(String) : [];
    const env = stringMap(config.env);
    const bridged = unwrapMcpRemote(config.command, args, env);
    if (bridged) return bridged;
    return {
      transport: "stdio",
      command: config.command,
      args,
      ...(env && { env }),
      ...(typeof config.cwd === "string" && config.cwd && { cwd: config.cwd }),
    };
  }
  const url = config.url ?? config.serverUrl ?? config.httpUrl;
  if (typeof url !== "string" || !url) throw new Error("Server has neither a command nor a url");
  const type = String(config.type ?? config.transportType ?? "").toLowerCase();
  const headers = stringMap(config.headers ?? config.http_headers);
  return { transport: type === "sse" ? "sse" : "http", url, ...(headers && { headers }) };
}

/** Writes a server the way the target client expects it. */
export function fromPortable(client: string, server: PortableServer): Record<string, any> {
  if (server.transport === "stdio") {
    const { command, args, env, cwd } = server;
    const base = { command, args, ...(env && { env }) };
    switch (client) {
      case "copilot":
      case "copilot_cli": return { type: "stdio", ...base, ...(cwd && { cwd }) };
      case "codex": return { type: "stdio", ...base };
      case "claude":
      case "claude_code": return base;
      default: return { ...base, ...(cwd && { cwd }) };
    }
  }
  const { transport, url, headers } = server;
  switch (client) {
    case "claude": {
      const names = Object.keys(headers ?? {});
      return {
        command: "npx",
        args: [
          "-y", "mcp-remote", url,
          ...(transport === "sse" ? ["--transport", "sse-only"] : []),
          ...names.flatMap((name, i) => ["--header", `${name}:\${${HEADER_ENV}${i}}`]),
        ],
        ...(names.length && { env: Object.fromEntries(names.map((name, i) => [`${HEADER_ENV}${i}`, headers![name]])) }),
      };
    }
    // Cline falls back to legacy SSE unless streamable HTTP is spelled exactly "streamableHttp".
    case "cline": return { type: transport === "sse" ? "sse" : "streamableHttp", url, ...(headers && { headers }) };
    case "codex": return { type: "http", url, ...(headers && { http_headers: headers }) };
    case "cursor":
    case "mcphub": return { url, ...(headers && { headers }) };
    default: return { type: transport, url, ...(headers && { headers }) };
  }
}

/** Converts one client's server entry into another client's format. */
export const convertServer = (toClient: string, config: Record<string, any>) => fromPortable(toClient, toPortable(config));

export const describe = (config: Record<string, any>) =>
  config.command
    ? [config.command, ...(config.args ?? [])].join(" ")
    : (config.url ?? config.serverUrl ?? config.httpUrl ?? "");

/** Sidebar projects, with the selected one always included. */
export const sidebarProjects = (visible: string[] | undefined, selected: string | null) =>
  [...new Set([...(visible ?? []), ...(selected ? [selected] : [])])];

/** Every Claude Code project and scope plus the other clients, never the target itself. */
export function buildSourceOptions(projects: string[], clients: SourceOption[], targetValue: string) {
  const cc = [
    ...projects.flatMap(dir => (["local", "project"] as const).map(scope => ({ value: ccSource(scope, dir), label: ccLabel(scope, dir) }))),
    { value: ccSource("user", ""), label: ccLabel("user", "") },
  ];
  const others = clients.filter(client => client.value !== "claude_code" && client.value !== targetValue);
  return { others, sourceOptions: [...cc.filter(option => option.value !== targetValue), ...others] };
}

/** Stage copies; a copy replaces the server, so a staged delete of the same name is dropped. */
export const stageCopy = ({ toCopy, toDelete }: Staged, names: string[]): Staged => ({
  toCopy: new Set([...toCopy, ...names]),
  toDelete: new Set([...toDelete].filter(name => !names.includes(name))),
});

/** Unstage a copy, restore a staged delete, or stage a delete of an existing server. */
export function toggleDelete({ toCopy, toDelete }: Staged, names: string[]): Staged {
  const copies = new Set(toCopy);
  const deletes = new Set(toDelete);
  for (const name of names) {
    if (copies.delete(name)) continue;
    if (!deletes.delete(name)) deletes.add(name);
  }
  return { toCopy: copies, toDelete: deletes };
}

/** Source servers the target lacks and that are not already staged. */
export const missingNames = (source: ServerMap, target: ServerMap, toCopy: Set<string>) =>
  Object.keys(source).filter(name => !(name in target) && !toCopy.has(name));

/** Names shown on the right: the target's servers plus staged copies. */
export const rightNamesOf = (target: ServerMap, toCopy: Set<string>) => [...new Set([...Object.keys(target), ...toCopy])];
