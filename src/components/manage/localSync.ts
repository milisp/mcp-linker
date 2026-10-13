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
export const ccLabel = (scope: ClaudeCodeScope, dir: string) =>
  scope === "user" ? "Claude Code · User" : `Claude Code · ${basename(dir)} · ${SCOPE_LABEL[scope]}`;

/** The option value the current target would have, so it can be left out of the sources. */
export const targetValueOf = (client: string, scope: ClaudeCodeScope, project: string | null) =>
  client === "claude_code" ? ccSource(scope, project ?? "") : client;

// Bookkeeping keys that should not travel to another client.
export const sanitize = ({ disabled: _d, _creator, updated_at, name: _n, ...rest }: Record<string, any>) => rest;

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
