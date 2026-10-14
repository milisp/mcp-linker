import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, FolderPlus, Settings2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useCCProjectStore } from "@/stores/ccProject";
import { useProjectPreferences } from "@/stores/projectPreferences";
import { getClient, hasProjectConfig, requiresConfigFile, takesPath } from "@/lib/clients";
import { pickClientPath } from "@/lib/data";
import { ClientSelector } from "./client-selector";

const basename = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() || path;

type Workspace = { path: string; hasConfig: boolean };
// Editor history does not change while choosing a target; read it once per client.
const workspaceCache = new Map<string, Promise<Workspace[]>>();
const listWorkspaces = (client: string) => {
  let list = workspaceCache.get(client);
  if (!list) {
    list = invoke<Workspace[]>("list_workspaces", { clientName: client });
    list.catch(() => workspaceCache.delete(client));
    workspaceCache.set(client, list);
  }
  return list;
};

/** Project folders (or config files) offered for the selected client, and how to add one. */
function useProjectChoices() {
  const { selectedClient, selectedPath, setSelectedPath, setClientPath } = useClientPathStore();
  const { projects, selectedProject, setProjects, setSelectedProject } = useCCProjectStore();
  const { preferences, loaded, error, load, setVisibleProjects } = useProjectPreferences();
  const [operationError, setOperationError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<{ client: string; list: Workspace[] }>({ client: "", list: [] });
  const claude = selectedClient === "claude_code";
  const editorProjects = hasProjectConfig(selectedClient);
  const path = claude ? selectedProject : selectedPath;
  const saved = preferences[selectedClient]?.visibleProjects;
  // Recent editor folders that already have a project config are shown until the user picks their own list.
  const recent = workspaces.client === selectedClient ? workspaces.list : [];
  const visible = saved ?? [...new Set([...(path ? [path] : []), ...recent.filter(item => item.hasConfig).map(item => item.path)])];
  const candidates = [...new Set([...visible, ...(claude ? projects : recent.map(item => item.path)), ...(path ? [path] : [])])];
  const choices = [...new Set([...visible, ...(path ? [path] : [])])];
  const choose = (value: string) => {
    if (claude) { setSelectedProject(value); setClientPath("claude_code", value); }
    else setSelectedPath(value);
  };
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!claude) return;
    let cancelled = false;
    invoke<string[]>("claude_list_projects").then(list => { if (!cancelled) setProjects(list); })
      .catch(error => { if (!cancelled) setOperationError(String(error)); });
    return () => { cancelled = true; };
  }, [claude, setProjects]);
  useEffect(() => {
    if (!editorProjects) return;
    let cancelled = false;
    listWorkspaces(selectedClient).then(list => { if (!cancelled) setWorkspaces({ client: selectedClient, list }); })
      .catch(error => { if (!cancelled) setOperationError(String(error)); });
    return () => { cancelled = true; };
  }, [editorProjects, selectedClient]);
  /** Resolves to whether a path was chosen. */
  const browse = async () => {
    try {
      const result = await pickClientPath(selectedClient);
      if (!result) return false;
      setVisibleProjects(selectedClient, [...visible, result]);
      choose(result);
      setOperationError(null);
      return true;
    } catch (error) { setOperationError(String(error)); return false; }
  };
  return { path, visible, candidates, choices, choose, browse, loaded, error: error || operationError, operationError, load, setVisibleProjects };
}

type ScopeOption = { value: string; label: string; description: string };

/** Each option explains itself in the list; the trigger shows only the scope name. */
function ScopeSelect({ value, options, onChange, ariaLabel }: { value: string; options: ScopeOption[]; onChange: (value: string) => void; ariaLabel: string }) {
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-8 w-auto gap-2 text-xs" aria-label={ariaLabel}><SelectValue>{options.find(option => option.value === value)?.label}</SelectValue></SelectTrigger>
    <SelectContent className="max-w-xs"><SelectGroup><SelectLabel className="text-xs text-muted-foreground">Scope</SelectLabel>{options.map(option => <SelectItem key={option.value} value={option.value} textValue={option.label}>
      <span className="flex flex-col items-start gap-0.5"><span className="font-medium">{option.label}</span><span className="whitespace-normal text-xs text-muted-foreground">{option.description}</span></span>
    </SelectItem>)}</SelectGroup></SelectContent>
  </Select>;
}

const claudeScopes: ScopeOption[] = [
  { value: "local", label: "Local", description: "Only you, only in the selected project. Stored in ~/.claude.json under that project." },
  { value: "project", label: "Project", description: "Everyone working on the selected project. Stored in .mcp.json at the project root, so it can be committed." },
  { value: "user", label: "User", description: "Only you, in every project. Stored in ~/.claude.json." },
];

/** User or project config, as Claude Code's scope selector does; the project list then shows only folders. */
export function InstallationScope() {
  const { selectedClient, selectedScope: scope, setSelectedScope: setScope } = useClientPathStore();
  const { selectedScope, setSelectedScope } = useCCProjectStore();
  const { choices, choose, browse, operationError } = useProjectChoices();
  if (selectedClient === "claude_code") return <ScopeSelect value={selectedScope} options={claudeScopes} onChange={value => setSelectedScope(value as "local" | "project" | "user")} ariaLabel="Claude Code scope" />;
  if (!hasProjectConfig(selectedClient)) return null;
  const client = getClient(selectedClient);
  const change = async (value: string) => {
    if (value === "user") return setScope("user");
    setScope("project");
    // Without a remembered folder there is nothing to target yet; pick or browse for one.
    if (useClientPathStore.getState().selectedScope === "project") return;
    if (choices[0]) choose(choices[0]);
    else await browse();
  };
  return <div className="flex items-center">
    <ScopeSelect value={scope} onChange={value => void change(value)} ariaLabel="Config scope" options={[
      { value: "user", label: "User", description: `Your own ${client?.label ?? selectedClient} settings, used in every project.` },
      { value: "project", label: "Project", description: `Only the selected folder, in ${client?.projectFile ?? "its project config"}. Can be committed and shared.` },
    ]} />
    {operationError && <span role="alert" className="text-xs text-destructive">{operationError}</span>}
  </div>;
}

/** Shared by management navigation, detail editing and the catalog add dialog. */
export function InstallationTarget({ allowClientChange = true, sidebar = false, compact = false }: { allowClientChange?: boolean; sidebar?: boolean; compact?: boolean }) {
  const { selectedClient, selectedScope: scope } = useClientPathStore();
  const { selectedScope } = useCCProjectStore();
  const { path, visible, candidates, choices, choose, browse, loaded, error, load, setVisibleProjects } = useProjectChoices();
  const [manage, setManage] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [query, setQuery] = useState("");
  const claude = selectedClient === "claude_code";
  const fileTarget = requiresConfigFile(selectedClient);
  // A folder or file is the target: Claude Code's local/project scopes, an editor's project scope, or custom's config file.
  const needsProject = claude ? selectedScope !== "user" : hasProjectConfig(selectedClient) ? scope === "project" : fileTarget;
  const showProjects = (claude || takesPath(selectedClient)) && needsProject;
  return <div className={compact ? "min-w-0 [&_button[role=combobox]]:h-8 [&_button[role=combobox]]:text-xs [&_.space-y-1>span]:hidden" : "min-w-0 space-y-2"}>
    {(allowClientChange || !sidebar) && <div className="flex flex-wrap items-end gap-2">
      {allowClientChange && <ClientSelector />}
      {!sidebar && !compact && <InstallationScope />}
      {!sidebar && showProjects && <>
        <div className="min-w-0 space-y-1"><span className="text-xs text-muted-foreground">{fileTarget ? "Config file" : "Project"}</span><Select value={path ?? ""} onValueChange={value => value === "__browse__" ? void browse() : choose(value)}><SelectTrigger className="w-44" aria-label="Target project"><SelectValue placeholder={fileTarget ? "Select a file" : "Select a directory"}>{path && <span className="block max-w-32 truncate">{basename(path)}</span>}</SelectValue></SelectTrigger><SelectContent>{choices.map(item => <SelectItem key={item} value={item}><span className="block">{basename(item)}</span><span className="block max-w-sm break-all text-xs text-muted-foreground">{item}</span></SelectItem>)}<SelectItem value="__browse__" disabled={!loaded}>{fileTarget ? "Browse for a config file…" : "Browse for a directory…"}</SelectItem></SelectContent></Select></div>
      </>}
    </div>}
    {sidebar && showProjects && <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="flex h-8 items-center gap-1">
        <CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm" className="h-8 flex-1 justify-start gap-2 px-2 text-xs text-muted-foreground">Projects<ChevronRight className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} /></Button></CollapsibleTrigger>
        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Manage visible projects" disabled={!loaded} onClick={() => setManage(true)}><Settings2 className="size-3.5" /></Button>
        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={fileTarget ? "Browse and add config file" : "Browse and add project"} disabled={!loaded} onClick={browse}><FolderPlus className="size-3.5" /></Button>
      </div>
      <CollapsibleContent className="space-y-0.5">
        {choices.map(item => <Tooltip key={item}>
          <TooltipTrigger asChild><Button type="button" variant="ghost" size="sm" className={`h-8 w-full justify-start pl-8 pr-2 text-xs ${path === item ? "bg-accent font-medium" : "text-muted-foreground"}`} aria-label={`Select project ${item}`} aria-pressed={path === item} onClick={() => choose(item)}><span className="truncate">{basename(item)}</span></Button></TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm break-all">{item}</TooltipContent>
        </Tooltip>)}
        {!choices.length && <p className="pl-8 pr-2 py-1 text-xs text-muted-foreground">{fileTarget ? "Add a config file with +" : "Add a project with +"}</p>}
      </CollapsibleContent>
    </Collapsible>}
    {error && <p role="alert" className="break-words text-xs text-destructive">{error} {!loaded && <Button type="button" variant="ghost" size="sm" onClick={() => void load()}>Retry</Button>}</p>}
    <Dialog open={manage} onOpenChange={setManage}><DialogContent><DialogHeader><DialogTitle>Visible projects</DialogTitle><DialogDescription>Choose projects to show for this client. Hiding a project does not delete its configuration. The current target remains available until you switch.</DialogDescription></DialogHeader>
      <Input aria-label="Search projects" placeholder="Search name or path" value={query} onChange={event => setQuery(event.target.value)} />
      <div className="max-h-72 space-y-3 overflow-y-auto">{candidates.filter(item => item.toLowerCase().includes(query.toLowerCase())).map(item => <label key={item} className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={visible.includes(item)} onCheckedChange={checked => setVisibleProjects(selectedClient, checked === true ? [...visible, item] : visible.filter(path => path !== item))} /><span className="min-w-0"><span className="block font-medium">{basename(item)}</span><span className="block break-all text-xs text-muted-foreground">{item}</span></span></label>)}{!candidates.length && <p className="text-sm text-muted-foreground">No projects yet. Browse to add a directory.</p>}</div>
      <Button type="button" variant="outline" onClick={browse}>{fileTarget ? "Add config file" : "Add directory"}</Button>
    </DialogContent></Dialog>
  </div>;
}
