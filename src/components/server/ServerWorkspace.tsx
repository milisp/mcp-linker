import { useMemo, useRef, useState } from "react";
import type { ServerType } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionFields } from "./form/ConnectionFields";
import { useServerEditor } from "./hooks/useServerEditor";
import { useSaveServerConfig } from "./hooks/useSaveServerConfig";
import { ToolsPanel } from "./tools/ToolsPanel";
import { quickInstallConfig } from "./utils/quickInstall";

export function ServerWorkspace({ server, onSaved, onOpenDetails, initialTab = "connection" }: { initialTab?: "connection" | "tools"; server: ServerType; onSaved?: () => void; onOpenDetails?: () => void }) {
  const editor = useServerEditor(server);
  const { saveServerConfig } = useSaveServerConfig();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const config = useMemo(() => editor.config.type === "stdio" ? { ...editor.config, args: editor.config.args.filter(arg => arg.length > 0) } : editor.config, [editor.config]);
  const complete = !!quickInstallConfig({ ...server, requiresConfiguration: false, configs: [config] });
  const installed = editor.draft.persistedName === editor.draft.name;
  const save = async () => {
    if (lock.current) return;
    if (!editor.draft.name.trim() || editor.draft.name !== editor.draft.name.trim() || !complete) { setError("Enter a server name and complete all connection fields and credentials."); return; }
    lock.current = true; setSaving(true); setError(null);
    try {
      const saved = await saveServerConfig({ selectedClient: editor.selectedClient, selectedPath: editor.selectedPath || "", currentServer: server, serverName: editor.draft.name, config, mode: installed ? "update" : "add", disabled: !!server.installed?.disabled, clearDraftOnSuccess: false, setIsDialogOpen: () => {} });
      if (saved) { editor.markSaved(); setRevision(value => value + 1); onSaved?.(); }
      else setError("Configuration could not be saved. Review the error and try again.");
    } finally { lock.current = false; setSaving(false); }
  };
  return <div className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="min-w-0 break-all">Client: {editor.selectedClient}{editor.selectedClient === "claude_code" && editor.selectedProject ? ` · ${editor.selectedProject}` : ""}</span>{onOpenDetails && <Button variant="ghost" size="sm" onClick={onOpenDetails}>Open full details</Button>}</div>
    {server.installed?.disabled && <p className="text-sm text-muted-foreground">This server is disabled in the client. Saving preserves that state; inspection runs separately.</p>}
    <Tabs defaultValue={initialTab}>
      <TabsList><TabsTrigger value="connection">Connection</TabsTrigger><TabsTrigger value="tools">Tools</TabsTrigger></TabsList>
      <TabsContent value="connection" className="space-y-4">
        <label className="block space-y-2"><span className="text-sm font-medium">Server name</span><input className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" readOnly={!!server.installed} value={editor.draft.name} onChange={event => editor.setName(event.target.value)} /></label>
        {editor.draft.configs.length > 1 && <div className="flex flex-wrap gap-2" aria-label="Connection options">{editor.draft.configs.map((option, index) => <Button key={index} size="sm" variant={index === editor.draft.index ? "default" : "outline"} onClick={() => editor.selectConfig(index)}>{option.type === "stdio" ? "Local" : "Remote"} · {option.type} {index + 1}</Button>)}</div>}
        <ConnectionFields config={editor.config} onChange={editor.setConfig} />
        {editor.draft.loadError && <p role="alert" className="text-sm text-destructive">Could not read the installed configuration: {editor.draft.loadError} <Button variant="outline" size="sm" onClick={editor.retryLoad}>Retry</Button></p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={saving || !editor.draft.loaded || !!editor.draft.loadError} onClick={save}>{saving ? "Saving..." : installed ? "Save connection" : "Add to client"}</Button>
      </TabsContent>
      <TabsContent value="tools" forceMount className="data-[state=inactive]:hidden"><ToolsPanel config={config} serverName={editor.draft.name.trim()} selectedClient={editor.selectedClient} workingDir={editor.selectedClient === "claude_code" ? editor.selectedProject : undefined} canConnect={complete} saveRevision={revision} /></TabsContent>
    </Tabs>
  </div>;
}
