import { ClientIcon } from "@/components/ClientIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clientLabel, getClients, takesPath } from "@/lib/clients";
import { LicenseRequiredError, claudeWrite, clientWrite, toClaudeRequest } from "@/lib/claude";
import { pickClientPath } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  SCOPE_LABEL,
  type ServerMap,
  type Staged,
  basename,
  buildSourceOptions,
  convertServer,
  ccLabel,
  ccSource,
  clientIdOf,
  describe,
  isCCSource,
  missingNames,
  parseCCSource,
  rightNamesOf,
  sidebarProjects,
  stageCopy,
  targetValueOf,
  toggleDelete as toggleDeleteStaged,
} from "./localSync";
import { type ClaudeCodeScope, useCCProjectStore } from "@/stores/ccProject";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useProjectPreferences } from "@/stores/projectPreferences";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft, Check, ChevronRight, ChevronsUpDown, ChevronsRight, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

async function readServers(client: string, path: string | null): Promise<ServerMap> {
  if (isCCSource(client)) {
    const { scope, dir } = parseCCSource(client);
    const list = await invoke<any[]>("claude_mcp_list", { workingDir: dir, scope });
    return Object.fromEntries((list || []).map(({ name, ...rest }) => [name, rest]));
  }
  const data = await invoke<any>("read_json_file", { clientName: client, path: path || undefined });
  return data?.mcpServers ?? {};
}

function useServers(client: string, path: string) {
  const [servers, setServers] = useState<ServerMap>({});
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!client) return setServers({});
    setLoading(true);
    try {
      setServers(await readServers(client, path || null));
    } catch (error) {
      setServers({});
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [client, path]);
  useEffect(() => { load(); }, [load]);
  return { servers, loading, reload: load };
}

const sideLabel = (value: string) => {
  if (!isCCSource(value)) return clientLabel(value);
  const { scope, dir } = parseCCSource(value);
  return ccLabel(scope, dir);
};

/** Two-pane copy between any two clients, Claude Code projects or scopes; copies and deletions are staged on the right until saved. */
export function LocalSyncPanel({ onClose, onSaved }: {
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const { selectedClient, selectedPath, getClientPath } = useClientPathStore();
  const { selectedProject, selectedScope } = useCCProjectStore();
  const visibleProjects = useProjectPreferences(state => state.preferences.claude_code?.visibleProjects);
  const projects = useMemo(() => sidebarProjects(visibleProjects, selectedProject), [visibleProjects, selectedProject]);
  const pathOf = useCallback((value: string) => (takesPath(value) ? getClientPath(value) || "" : ""), [getClientPath]);

  // The target starts as the sidebar's selection and follows it when that changes.
  const sidebarTarget = targetValueOf(selectedClient, selectedScope, selectedProject);
  const [toClient, setToClient] = useState(sidebarTarget);
  const sidebarPath = takesPath(selectedClient) ? selectedPath || "" : "";
  const [toPath, setToPath] = useState(sidebarPath);
  useEffect(() => {
    setToClient(sidebarTarget);
    setToPath(sidebarPath);
  }, [sidebarTarget, sidebarPath]);

  const [fromClient, setFromClient] = useState(() => localStorage.getItem("syncFromClient") || "");
  const [fromPath, setFromPath] = useState(() => pathOf(fromClient));
  const chooseFrom = (value: string) => {
    setFromClient(value);
    setFromPath(pathOf(value));
  };
  const chooseTo = (value: string) => {
    setToClient(value);
    setToPath(pathOf(value));
  };

  // A side can't be the other side, except for path-based clients, where the path tells them apart.
  const excludeFrom = takesPath(toClient) ? "" : toClient;
  const excludeTo = takesPath(fromClient) ? "" : fromClient;
  const fromOptions = useMemo(
    () => buildSourceOptions(projects, getClients().map(({ id, label }) => ({ value: id, label })), excludeFrom).sourceOptions,
    [projects, excludeFrom],
  );

  // Drop a remembered source that is no longer offered (it became the target, or its project left the sidebar).
  useEffect(() => {
    if (fromClient && !fromOptions.some(option => option.value === fromClient)) chooseFrom("");
  }, [fromClient, fromOptions]);
  useEffect(() => localStorage.setItem("syncFromClient", fromClient), [fromClient]);

  const { servers: source, loading } = useServers(fromClient, fromPath);
  const { servers: target, loading: targetLoading, reload: reloadTarget } = useServers(toClient, toPath);
  const sameSide = !!fromClient && fromClient === toClient && fromPath === toPath;

  const [saving, setSaving] = useState(false);
  const [toCopy, setToCopy] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<Set<string>>(new Set());
  const [leftSel, setLeftSel] = useState<Set<string>>(new Set());
  const [rightSel, setRightSel] = useState<Set<string>>(new Set());
  const [leftFilter, setLeftFilter] = useState("");
  const [rightFilter, setRightFilter] = useState("");

  const resetStaged = () => {
    setToCopy(new Set());
    setToDelete(new Set());
    setLeftSel(new Set());
    setRightSel(new Set());
  };

  // Either side changed; staged moves no longer apply.
  useEffect(resetStaged, [fromClient, fromPath, toClient, toPath]);

  const leftNames = useMemo(() => Object.keys(source), [source]);
  const rightNames = useMemo(() => rightNamesOf(target, toCopy), [target, toCopy]);
  const missing = missingNames(source, target, toCopy);

  const applyStaged = (next: Staged) => {
    setToCopy(next.toCopy);
    setToDelete(next.toDelete);
  };
  const copy = (names: string[]) => {
    applyStaged(stageCopy({ toCopy, toDelete }, names));
    setLeftSel(new Set());
  };
  const toggleDelete = (names: string[]) => {
    applyStaged(toggleDeleteStaged({ toCopy, toDelete }, names));
    setRightSel(new Set());
  };

  const writeTarget = async (name: string, config?: Record<string, any>) => {
    if (isCCSource(toClient)) {
      const { scope, dir } = parseCCSource(toClient);
      if (scope !== "user" && !dir) throw new Error("Please select a Claude Code project");
      const where = { workingDir: dir, scope };
      return config
        ? claudeWrite("claude_mcp_add", { request: toClaudeRequest(name, config), ...where })
        : claudeWrite("claude_mcp_remove", { name, ...where });
    }
    const where = { clientName: toClient, path: toPath || undefined, serverName: name };
    return config
      ? clientWrite("update_mcp_server", { ...where, serverConfig: config })
      : clientWrite("remove_mcp_server", where);
  };

  const pending = toCopy.size + toDelete.size;

  const save = async () => {
    setSaving(true);
    let done = 0;
    const failures: string[] = [];
    // One at a time: every write rewrites the same config file. A bad entry
    // must not stop the rest, but a missing license stops everything.
    const run = async (name: string, write: () => Promise<unknown>) => {
      try {
        await write();
        done++;
      } catch (error) {
        if (error instanceof LicenseRequiredError) throw error;
        failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    try {
      for (const name of toDelete) await run(name, () => writeTarget(name));
      for (const name of toCopy) await run(name, async () => writeTarget(name, convertServer(clientIdOf(toClient), source[name])));
    } catch {
      // The upgrade dialog already explains a missing license.
    } finally {
      if (done) toast.success(t("manage.sync.saved", { count: done }));
      if (failures.length) toast.error(failures.join("\n"));
      resetStaged();
      await Promise.all([reloadTarget(), onSaved()]);
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          <ArrowLeft className="size-4" />
          {t("manage.sync.back")}
        </Button>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <>
              <span className="text-sm text-muted-foreground">{t("manage.sync.pending", { count: pending })}</span>
              <Button variant="outline" size="sm" onClick={resetStaged} disabled={saving}>
                {t("manage.sync.reset")}
              </Button>
            </>
          )}
          <Button size="sm" onClick={save} disabled={!pending || saving || sameSide}>
            {saving && <RefreshCw className="size-4 animate-spin" />}
            {t("save")}
          </Button>
        </div>
      </div>

      {sameSide && <p className="text-sm text-destructive">{t("manage.sync.sameSide")}</p>}

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3">
        <ServerBox
          header={
            <SidePicker
              value={fromClient}
              onChange={chooseFrom}
              path={fromPath}
              onPathChange={setFromPath}
              exclude={excludeFrom}
              projects={projects}
              defaultProject={selectedProject}
              placeholder={t("manage.sync.pickSource")}
              pathPlaceholder={t("manage.sync.pathPlaceholder")}
              side="Source"
              disabled={saving}
            />
          }
          title={fromClient ? t("manage.sync.available", { client: sideLabel(fromClient) }) : t("manage.sync.from")}
          names={leftNames}
          filter={leftFilter}
          onFilter={setLeftFilter}
          selected={leftSel}
          onSelect={setLeftSel}
          onActivate={name => !sameSide && copy([name])}
          configOf={name => source[name] ?? {}}
          badgeOf={name =>
            toCopy.has(name) ? { label: t("manage.sync.queued"), variant: "default" }
            : name in target ? { label: t("manage.sync.exists"), variant: "secondary" }
            : undefined}
          empty={loading ? t("loading") : fromClient ? t("manage.sync.empty") : t("manage.sync.pickSource")}
          footer={
            <Button variant="ghost" size="sm" onClick={() => copy(missing)} disabled={!missing.length || saving || sameSide}>
              {t("manage.sync.copyMissing")}
              <ChevronsRight className="size-4" />
            </Button>
          }
        />

        <div className="flex flex-col items-center justify-center">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("manage.sync.copy")}
            title={t("manage.sync.copy")}
            onClick={() => copy([...leftSel])}
            disabled={!leftSel.size || saving || sameSide}
          >
            <ChevronRight />
          </Button>
        </div>

        <ServerBox
          header={
            <SidePicker
              value={toClient}
              onChange={chooseTo}
              path={toPath}
              onPathChange={setToPath}
              exclude={excludeTo}
              projects={projects}
              defaultProject={selectedProject}
              placeholder={t("manage.sync.pickTarget")}
              pathPlaceholder={t("manage.sync.targetPathPlaceholder")}
              side="Target"
              disabled={saving}
            />
          }
          title={toClient ? t("manage.sync.chosen", { client: sideLabel(toClient) }) : t("manage.sync.to")}
          names={rightNames}
          filter={rightFilter}
          onFilter={setRightFilter}
          selected={rightSel}
          onSelect={setRightSel}
          onActivate={name => toggleDelete([name])}
          configOf={name => (toCopy.has(name) ? source[name] : target[name]) ?? {}}
          badgeOf={name =>
            toCopy.has(name)
              ? { label: t(name in target ? "manage.sync.overwrite" : "manage.sync.adding"), variant: "default" }
              : toDelete.has(name) ? { label: t("manage.sync.removing"), variant: "destructive" }
              : undefined}
          struck={toDelete}
          empty={targetLoading ? t("loading") : toClient ? t("manage.sync.empty") : t("manage.sync.pickTarget")}
          footer={
            <Button variant="ghost" size="sm" onClick={() => toggleDelete([...rightSel])} disabled={!rightSel.size || saving}>
              <Trash2 className="size-4" />
              {t("manage.sync.deleteSelected")}
            </Button>
          }
        />
      </div>
    </div>
  );
}

/** Picks one side: a client, or a Claude Code scope and project, plus a config path for clients that take one. */
function SidePicker({ value, onChange, path, onPathChange, exclude, projects, defaultProject, placeholder, pathPlaceholder, side, disabled }: {
  value: string;
  onChange: (value: string) => void;
  path: string;
  onPathChange: (path: string) => void;
  exclude: string;
  projects: string[];
  defaultProject: string | null;
  placeholder: string;
  pathPlaceholder: string;
  side: string;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [draft, setDraft] = useState(path);
  useEffect(() => setDraft(path), [path]);

  const { others, sourceOptions } = useMemo(
    () => buildSourceOptions(projects, getClients().map(({ id, label }) => ({ value: id, label })), exclude),
    [projects, exclude],
  );
  const cc = isCCSource(value) ? parseCCSource(value) : null;
  const isExcluded = (scope: ClaudeCodeScope, dir: string) => ccSource(scope, dir) === exclude;

  const pickClient = (next: string) => {
    if (next !== "claude_code") return onChange(next);
    onChange(sourceOptions.find(option => isCCSource(option.value))?.value ?? "");
  };
  const pickScope = (scope: ClaudeCodeScope) =>
    onChange(ccSource(scope, scope === "user" ? "" : cc?.dir || defaultProject || projects[0] || ""));

  const browse = async () => {
    const picked = await pickClientPath(value);
    if (picked) onPathChange(picked);
  };

  return (
    <div className="flex flex-col gap-2">
      <Select value={cc ? "claude_code" : value} onValueChange={pickClient} disabled={disabled}>
        <SelectTrigger className="w-full" aria-label={`${side} client`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="claude_code" textValue="Claude Code"><ClientIcon client="claude_code" />Claude Code</SelectItem>
          {others.map(option => (
            <SelectItem key={option.value} value={option.value} textValue={option.label}>
              <ClientIcon client={option.value} />
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {cc && (
        <div className="flex gap-2">
          <Select value={cc.scope} onValueChange={next => pickScope(next as ClaudeCodeScope)} disabled={disabled}>
            <SelectTrigger className="w-28" aria-label={`${side} scope`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["local", "project", "user"] as const).map(scope => (
                <SelectItem
                  key={scope}
                  value={scope}
                  disabled={scope === "user" ? isExcluded("user", "") : !projects.length || isExcluded(scope, cc.dir || defaultProject || "")}
                >
                  {SCOPE_LABEL[scope]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cc.scope !== "user" && (
            <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={projectPickerOpen} aria-label={`${side} project`} className="min-w-0 flex-1 justify-between font-normal" disabled={disabled}>
                  <span className="min-w-0 truncate">{cc.dir ? basename(cc.dir) : "Choose a project"}</span>
                  <ChevronsUpDown className="size-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) min-w-80 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Filter projects" />
                  <CommandList>
                    <CommandEmpty>No matching project.</CommandEmpty>
                    <CommandGroup>
                      {projects.map(dir => (
                        <CommandItem
                          key={dir}
                          value={dir}
                          disabled={isExcluded(cc.scope, dir)}
                          onSelect={() => { onChange(ccSource(cc.scope, dir)); setProjectPickerOpen(false); }}
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{basename(dir)}</span>
                            <span className="break-all text-xs text-muted-foreground">{dir}</span>
                          </span>
                          {cc.dir === dir && <Check className="ml-auto" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
      {takesPath(value) && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => draft !== path && onPathChange(draft)}
            placeholder={pathPlaceholder}
            disabled={disabled}
          />
          <Button variant="outline" onClick={browse} disabled={disabled}>{t("manage.sync.browse")}</Button>
        </div>
      )}
    </div>
  );
}

function ServerBox({ header, title, names, filter, onFilter, selected, onSelect, onActivate, configOf, badgeOf, struck, empty, footer }: {
  header: React.ReactNode;
  title: string;
  names: string[];
  filter: string;
  onFilter: (value: string) => void;
  selected: Set<string>;
  onSelect: (next: Set<string>) => void;
  onActivate: (name: string) => void;
  configOf: (name: string) => Record<string, any>;
  badgeOf: (name: string) => { label: string; variant: "default" | "secondary" | "destructive" } | undefined;
  struck?: Set<string>;
  empty: string;
  footer: React.ReactNode;
}) {
  const { t } = useTranslation();
  const visible = names
    .filter(name => name.toLowerCase().includes(filter.trim().toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const toggle = (name: string) => {
    const next = new Set(selected);
    if (!next.delete(name)) next.add(name);
    onSelect(next);
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {header}
      <div className="flex min-h-0 flex-col overflow-hidden rounded-md border">
        <div className="border-b bg-muted/50 px-3 py-2 text-sm font-medium">{title}</div>
        <div className="border-b p-2">
          <Input value={filter} onChange={e => onFilter(e.target.value)} placeholder={t("manage.sync.filter")} className="h-8" />
        </div>
        <ul className="h-80 overflow-y-auto p-1" role="listbox" aria-multiselectable>
          {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{empty}</li>}
          {visible.map(name => {
            const badge = badgeOf(name);
            return (
              <li
                key={name}
                role="option"
                aria-selected={selected.has(name)}
                onClick={() => toggle(name)}
                onDoubleClick={() => onActivate(name)}
                className={cn(
                  "flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 hover:bg-accent",
                  selected.has(name) && "bg-primary/10 hover:bg-primary/15",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-sm font-medium", struck?.has(name) && "text-muted-foreground line-through")}>{name}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">{describe(configOf(name))}</div>
                </div>
                {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end border-t p-1">{footer}</div>
      </div>
    </div>
  );
}
