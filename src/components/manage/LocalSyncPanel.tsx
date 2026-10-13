import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { availableClients } from "@/constants/clients";
import { LicenseRequiredError, claudeWrite, clientWrite, toClaudeRequest } from "@/lib/claude";
import { needspathClient } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useCCProjectStore } from "@/stores/ccProject";
import { useClientPathStore } from "@/stores/clientPathStore";
import { ServerTableData } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ArrowLeft, ChevronRight, ChevronsRight, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type ServerMap = Record<string, Record<string, any>>;

const clientLabel = (value: string) =>
  availableClients.find(client => client.value === value)?.label ?? value;

// Bookkeeping keys that should not travel to another client.
const sanitize = ({ disabled: _d, _creator, updated_at, name: _n, ...rest }: Record<string, any>) => rest;

const describe = (config: Record<string, any>) =>
  config.command
    ? [config.command, ...(config.args ?? [])].join(" ")
    : (config.url ?? config.serverUrl ?? config.httpUrl ?? "");

async function readServers(client: string, path: string | null): Promise<ServerMap> {
  if (client === "claude_code") {
    const { selectedProject, selectedScope } = useCCProjectStore.getState();
    if (selectedScope !== "user" && !selectedProject) throw new Error("Please select a Claude Code project");
    const list = await invoke<any[]>("claude_mcp_list", { workingDir: selectedProject || "", scope: selectedScope });
    return Object.fromEntries((list || []).map(({ name, ...rest }) => [name, rest]));
  }
  const data = await invoke<any>("read_json_file", { clientName: client, path: path || undefined });
  return data?.mcpServers ?? {};
}

/** Two-pane copy: a source client's servers on the left stay put; copies and deletions are staged on the right until saved. */
export function LocalSyncPanel({ targetServers, onClose, onSaved }: {
  targetServers: ServerTableData[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const { selectedClient, selectedPath, getClientPath, setClientPath } = useClientPathStore();
  const { selectedProject, selectedScope } = useCCProjectStore();

  const [fromClient, setFromClient] = useState(() => {
    const saved = localStorage.getItem("syncFromClient") || "";
    return saved === selectedClient ? "" : saved;
  });
  const [fromPath, setFromPath] = useState("");
  const [source, setSource] = useState<ServerMap>({});
  const [loading, setLoading] = useState(false);
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

  const loadSource = useCallback(async () => {
    if (!fromClient) return setSource({});
    setLoading(true);
    try {
      setSource(await readServers(fromClient, getClientPath(fromClient)));
    } catch (error) {
      setSource({});
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [fromClient, getClientPath]);

  useEffect(() => {
    localStorage.setItem("syncFromClient", fromClient);
    setFromPath(fromClient ? getClientPath(fromClient) || "" : "");
    resetStaged();
    loadSource();
  }, [fromClient, loadSource, getClientPath]);

  // The target changed under us (sidebar); staged moves no longer apply.
  useEffect(resetStaged, [selectedClient, selectedPath, selectedProject, selectedScope]);

  const target = useMemo(
    () => Object.fromEntries(targetServers.map(({ name, ...rest }) => [name, rest as Record<string, any>])),
    [targetServers],
  );

  const leftNames = useMemo(() => Object.keys(source), [source]);
  const rightNames = useMemo(() => [...new Set([...Object.keys(target), ...toCopy])], [target, toCopy]);
  const missing = leftNames.filter(name => !(name in target) && !toCopy.has(name));

  const copy = (names: string[]) => {
    setToCopy(prev => new Set([...prev, ...names]));
    // A copy replaces the server, so a staged delete of the same name is moot.
    setToDelete(prev => new Set([...prev].filter(name => !names.includes(name))));
    setLeftSel(new Set());
  };

  // Unstage a copy, restore a staged delete, or stage a delete of an existing server.
  const toggleDelete = (names: string[]) => {
    const copies = new Set(toCopy);
    const deletes = new Set(toDelete);
    for (const name of names) {
      if (copies.delete(name)) continue;
      if (!deletes.delete(name)) deletes.add(name);
    }
    setToCopy(copies);
    setToDelete(deletes);
    setRightSel(new Set());
  };

  const writeTarget = async (name: string, config?: Record<string, any>) => {
    if (selectedClient === "claude_code") {
      if (selectedScope !== "user" && !selectedProject) throw new Error("Please select a Claude Code project");
      const where = { workingDir: selectedProject || "", scope: selectedScope };
      return config
        ? claudeWrite("claude_mcp_add", { request: toClaudeRequest(name, config), ...where })
        : claudeWrite("claude_mcp_remove", { name, ...where });
    }
    const where = { clientName: selectedClient, path: selectedPath || undefined, serverName: name };
    return config
      ? clientWrite("update_mcp_server", { ...where, serverConfig: config })
      : clientWrite("remove_mcp_server", where);
  };

  const pending = toCopy.size + toDelete.size;

  const save = async () => {
    setSaving(true);
    let done = 0;
    try {
      // One at a time: every write rewrites the same config file.
      for (const name of toDelete) { await writeTarget(name); done++; }
      for (const name of toCopy) { await writeTarget(name, sanitize(source[name])); done++; }
      toast.success(t("manage.sync.saved", { count: done }));
    } catch (error) {
      if (!(error instanceof LicenseRequiredError)) {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    } finally {
      resetStaged();
      await onSaved();
      setSaving(false);
    }
  };

  const browseFromPath = async () => {
    const picked = await openDialog({ directory: true, multiple: false });
    if (typeof picked === "string") {
      setFromPath(picked);
      setClientPath(fromClient, picked);
      loadSource();
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
          <Button size="sm" onClick={save} disabled={!pending || saving}>
            {saving && <RefreshCw className="size-4 animate-spin" />}
            {t("save")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3">
        <ServerBox
          header={
            <div className="flex flex-col gap-2">
              <Select value={fromClient} onValueChange={setFromClient} disabled={saving}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("manage.sync.pickSource")} />
                </SelectTrigger>
                <SelectContent>
                  {availableClients
                    .filter(client => client.value !== selectedClient)
                    .map(client => (
                      <SelectItem key={client.value} value={client.value}>{client.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {needspathClient.includes(fromClient) && (
                <div className="flex gap-2">
                  <Input
                    value={fromPath}
                    onChange={e => setFromPath(e.target.value)}
                    onBlur={() => { setClientPath(fromClient, fromPath || null); loadSource(); }}
                    placeholder={t("manage.sync.pathPlaceholder")}
                  />
                  <Button variant="outline" onClick={browseFromPath}>{t("manage.sync.browse")}</Button>
                </div>
              )}
            </div>
          }
          title={fromClient ? t("manage.sync.available", { client: clientLabel(fromClient) }) : t("manage.sync.from")}
          names={leftNames}
          filter={leftFilter}
          onFilter={setLeftFilter}
          selected={leftSel}
          onSelect={setLeftSel}
          onActivate={name => copy([name])}
          configOf={name => source[name] ?? {}}
          badgeOf={name =>
            toCopy.has(name) ? { label: t("manage.sync.queued"), variant: "default" }
            : name in target ? { label: t("manage.sync.exists"), variant: "secondary" }
            : undefined}
          empty={loading ? t("loading") : fromClient ? t("manage.sync.empty") : t("manage.sync.pickSource")}
          footer={
            <Button variant="ghost" size="sm" onClick={() => copy(missing)} disabled={!missing.length || saving}>
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
            disabled={!leftSel.size || saving}
          >
            <ChevronRight />
          </Button>
        </div>

        <ServerBox
          header={
            <div className="flex h-9 items-center text-sm text-muted-foreground">
              {t("manage.sync.to")}&nbsp;<span className="font-medium text-foreground">{clientLabel(selectedClient)}</span>
            </div>
          }
          title={t("manage.sync.chosen", { client: clientLabel(selectedClient) })}
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
          empty={t("manage.sync.empty")}
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
