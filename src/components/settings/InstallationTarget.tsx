import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, Plus, Settings2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useCCProjectStore } from "@/stores/ccProject";
import { useProjectPreferences } from "@/stores/projectPreferences";
import { ClientSelector } from "./client-selector";

const projectClients = ["claude_code", "cursor", "roo_code", "copilot", "custom", "vscode"];
const basename = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() || path;

export function InstallationScope() {
  const { selectedClient } = useClientPathStore();
  const { selectedScope, setSelectedScope } = useCCProjectStore();
  if (selectedClient !== "claude_code") return null;
  return <Select value={selectedScope} onValueChange={value => setSelectedScope(value as "local" | "project" | "user")}><SelectTrigger className="h-8 w-auto gap-2 text-xs" aria-label="Claude Code scope"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="local">Local</SelectItem><SelectItem value="project">Project</SelectItem><SelectItem value="user">User</SelectItem></SelectContent></Select>;
}

/** Shared by management navigation, detail editing and the catalog add dialog. */
export function InstallationTarget({ allowClientChange = true, sidebar = false }: { allowClientChange?: boolean; sidebar?: boolean }) {
  const { selectedClient, selectedPath, setSelectedPath, setClientPath } = useClientPathStore();
  const { projects, selectedProject, selectedScope, setProjects, setSelectedProject } = useCCProjectStore();
  const { preferences, loaded, error, load, setVisibleProjects } = useProjectPreferences();
  const [manage, setManage] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [query, setQuery] = useState("");
  const [operationError, setOperationError] = useState<string | null>(null);
  const claude = selectedClient === "claude_code";
  const supportsProject = projectClients.includes(selectedClient);
  const path = claude ? selectedProject : selectedPath;
  const saved = preferences[selectedClient]?.visibleProjects;
  const visible = saved ?? (path ? [path] : []);
  const candidates = [...new Set([...visible, ...(claude ? projects : []), ...(path ? [path] : [])])];
  const choices = [...new Set([...visible, ...(path ? [path] : [])])];
  const needsProject = claude && selectedScope !== "user";
  const choose = (value: string) => {
    if (claude) { setSelectedProject(value); setClientPath("claude_code", value); }
    else setSelectedPath(value || null);
  };
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!claude) return;
    let cancelled = false;
    invoke<string[]>("claude_list_projects").then(list => { if (!cancelled) setProjects(list); })
      .catch(error => { if (!cancelled) setOperationError(String(error)); });
    return () => { cancelled = true; };
  }, [claude, setProjects]);
  const browse = async () => {
    try {
      const result = await open({ directory: true, multiple: false });
      if (!result) return;
      setVisibleProjects(selectedClient, [...visible, result]);
      choose(result);
      setOperationError(null);
    } catch (error) { setOperationError(String(error)); }
  };
  return <div className="min-w-0 space-y-2">
    {(allowClientChange || !sidebar) && <div className="flex flex-wrap items-end gap-2">
      {allowClientChange && <ClientSelector />}
      {!sidebar && <InstallationScope />}
      {!sidebar && supportsProject && (!claude || needsProject) && <>
        <div className="min-w-0 space-y-1"><span className="text-xs text-muted-foreground">{selectedClient === "custom" ? "Config directory" : "Project"}</span><Select value={path || "__user__"} onValueChange={value => choose(value === "__user__" ? "" : value)}><SelectTrigger className="w-44" aria-label="Target project"><SelectValue><span className="block max-w-32 truncate">{path ? basename(path) : needsProject || ["custom", "vscode"].includes(selectedClient) ? "Select a directory" : "User configuration"}</span></SelectValue></SelectTrigger><SelectContent><SelectItem value="__user__">{needsProject || ["custom", "vscode"].includes(selectedClient) ? "Select a directory" : "User configuration"}</SelectItem>{choices.map(item => <SelectItem key={item} value={item}><span className="block">{basename(item)}</span><span className="block max-w-sm break-all text-xs text-muted-foreground">{item}</span></SelectItem>)}</SelectContent></Select></div>
      </>}
    </div>}
    {sidebar && supportsProject && (!claude || needsProject) && <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="flex h-8 items-center gap-1">
        <CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm" className="h-8 flex-1 justify-start gap-2 px-2 text-xs text-muted-foreground">Projects<ChevronRight className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} /></Button></CollapsibleTrigger>
        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Manage visible projects" disabled={!loaded} onClick={() => setManage(true)}><Settings2 className="size-3.5" /></Button>
        <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Browse and add project" disabled={!loaded} onClick={browse}><Plus className="size-3.5" /></Button>
      </div>
      <CollapsibleContent className="space-y-0.5">
        {!needsProject && !["custom", "vscode"].includes(selectedClient) && <Button type="button" variant="ghost" size="sm" className={`h-8 w-full justify-start pl-8 pr-2 text-xs ${!path ? "bg-accent" : ""}`} onClick={() => choose("")}>User configuration</Button>}
        {choices.map(item => <Tooltip key={item}>
          <TooltipTrigger asChild><Button type="button" variant="ghost" size="sm" className={`h-8 w-full justify-start pl-8 pr-2 text-xs ${path === item ? "bg-accent font-medium" : "text-muted-foreground"}`} aria-label={`Select project ${item}`} aria-pressed={path === item} onClick={() => choose(item)}><span className="truncate">{basename(item)}</span></Button></TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm break-all">{item}</TooltipContent>
        </Tooltip>)}
        {!choices.length && <p className="pl-8 pr-2 py-1 text-xs text-muted-foreground">Add a project with +</p>}
      </CollapsibleContent>
    </Collapsible>}
    {(error || operationError) && <p role="alert" className="break-words text-xs text-destructive">{error || operationError} {!loaded && <Button type="button" variant="ghost" size="sm" onClick={() => void load()}>Retry</Button>}</p>}
    <Dialog open={manage} onOpenChange={setManage}><DialogContent><DialogHeader><DialogTitle>Visible projects</DialogTitle><DialogDescription>Choose projects to show for this client. Hiding a project does not delete its configuration. The current target remains available until you switch.</DialogDescription></DialogHeader>
      <Input aria-label="Search projects" placeholder="Search name or path" value={query} onChange={event => setQuery(event.target.value)} />
      <div className="max-h-72 space-y-3 overflow-y-auto">{candidates.filter(item => item.toLowerCase().includes(query.toLowerCase())).map(item => <label key={item} className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={visible.includes(item)} onCheckedChange={checked => setVisibleProjects(selectedClient, checked === true ? [...visible, item] : visible.filter(path => path !== item))} /><span className="min-w-0"><span className="block font-medium">{basename(item)}</span><span className="block break-all text-xs text-muted-foreground">{item}</span></span></label>)}{!candidates.length && <p className="text-sm text-muted-foreground">No projects yet. Browse to add a directory.</p>}</div>
      <Button type="button" variant="outline" onClick={browse}>Add directory</Button>
    </DialogContent></Dialog>
  </div>;
}
