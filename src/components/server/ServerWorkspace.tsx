import { useMemo, useRef, useState } from "react";
import type { ServerType } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionFields } from "./form/ConnectionFields";
import { useServerEditor } from "./hooks/useServerEditor";
import { useSaveServerConfig } from "./hooks/useSaveServerConfig";
import { ToolsPanel } from "./tools/ToolsPanel";
import { quickInstallConfig } from "./utils/quickInstall";
import { ChevronDown, Cloud, Trash2 } from "lucide-react";
import { DeleteAlertDialog } from "@/components/common/DeleteAlertDialog";
import { useMcpRefresh } from "@/contexts/McpRefreshContext";
import { LicenseRequiredError } from "@/lib/claude";
import { toast } from "sonner";
import { uninstallServer } from "./utils/installedServer";
import { clientLabel as labelOf } from "@/lib/clients";
import { InstallationTarget } from "@/components/settings/InstallationTarget";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ServerWorkspace({ server, onSaved, onUninstalled, initialTab = "connection" }: { initialTab?: "connection" | "tools"; server: ServerType; onSaved?: (name: string) => void; onUninstalled?: () => void }) {
  const editor = useServerEditor(server);
  const { saveServerConfig } = useSaveServerConfig();
  const { refreshServerList } = useMcpRefresh();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const config = useMemo(() => editor.config, [editor.config]);
  const complete = !!quickInstallConfig({ ...server, requiresConfiguration: false, configs: [config] });
  const installed = editor.draft.persistedName === editor.draft.name;
  const clientLabel = labelOf(editor.selectedClient);
  const targetPath = editor.selectedClient === "claude_code" ? editor.selectedProject : editor.selectedPath;
  const projectName = targetPath?.split(/[\\/]/).filter(Boolean).pop();
  const targetLabel = editor.selectedClient === "claude_code"
    ? `${clientLabel} · ${editor.selectedScope === "user" ? "User" : `${editor.selectedScope === "local" ? "Local" : "Project"} · ${projectName || "Select project"}`}`
    : `${clientLabel}${projectName ? ` · ${projectName}` : ""}`;
  const save = async () => {
    if (lock.current) return;
    if (!editor.draft.name.trim()) { setError("Enter a server name."); return; }
    if (editor.draft.name !== editor.draft.name.trim()) { setError("Remove leading or trailing spaces from the server name."); return; }
    if (!complete) {
      if (config.type === "http" || config.type === "sse") {
        try {
          if (!["http:", "https:"].includes(new URL(config.url).protocol)) throw new Error("Invalid protocol");
        } catch {
          setError("Enter a valid HTTP or HTTPS server URL.");
          return;
        }
        const incompleteHeaders = Object.entries(config.headers ?? {}).filter(([, value]) => !value.trim() || /<[^>]+>|\{[^}]+\}|\b(?:YOUR_|REPLACE_|CHANGE_ME|TODO)/i.test(value)).map(([key]) => key);
        setError(incompleteHeaders.length
          ? `Complete the values for these headers: ${incompleteHeaders.join(", ")}. Replace placeholders or remove headers you do not need.`
          : "Replace unresolved placeholders in the server URL.");
        return;
      }
      setError(config.type === "stdio"
        ? "Complete the command, arguments and environment variable values. Replace any placeholders, including credentials."
        : config.type === "encrypted"
          ? "Decrypt this configuration before saving."
          : "Enter a valid HTTP or HTTPS URL and complete all header values. Replace any placeholders, including credentials.");
      return;
    }
    lock.current = true; setSaving(true); setError(null);
    try {
      const saved = await saveServerConfig({ selectedClient: editor.selectedClient, selectedPath: editor.selectedPath || "", currentServer: server, serverName: editor.draft.name, config, mode: installed ? "update" : "add", disabled: !!server.installed?.disabled, clearDraftOnSuccess: false, setIsDialogOpen: () => {} });
      if (saved) { editor.markSaved(); setRevision(value => value + 1); onSaved?.(editor.draft.name); }
      else setError("Configuration could not be saved. Review the error and try again.");
    } finally { lock.current = false; setSaving(false); }
  };
  const uninstall = async () => {
    try {
      await uninstallServer(editor.draft.persistedName!);
      toast.success(`Uninstalled ${editor.draft.persistedName}`);
      refreshServerList(editor.selectedClient, editor.selectedPath || undefined);
      editor.markUninstalled();
      onUninstalled?.();
    } catch (error) {
      if (!(error instanceof LicenseRequiredError)) toast.error(`Failed to uninstall: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const section = "space-y-2 p-4";
  // A custom server offers one blank config per transport; the type control switches between them.
  const custom = server.source === "custom";
  return <div className="min-w-0 space-y-4">
    {server.installed?.disabled && <p className="text-sm text-muted-foreground">This server is disabled in the client. Saving preserves that state; inspection runs separately.</p>}
    <Tabs defaultValue={initialTab}>
      <div className="flex items-center justify-between gap-2">
        <TabsList><TabsTrigger value="connection">Configure</TabsTrigger><TabsTrigger value="tools">Tools</TabsTrigger></TabsList>
        {installed && <DeleteAlertDialog
          itemName={`"${editor.draft.persistedName}" from ${targetLabel}`}
          onDelete={uninstall}
          trigger={<Button variant="ghost" size="sm" className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"><Trash2 className="size-4" /> Uninstall</Button>}
        />}
      </div>
      <TabsContent value="connection" className="space-y-4">
        <div className="divide-y rounded-xl border bg-card">
          <label className={`block ${section}`}><span className="text-sm font-medium">Server name</span><input className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" readOnly={!!server.installed} value={editor.draft.name} placeholder={custom ? "MCP server name" : undefined} onChange={event => editor.setName(event.target.value)} /></label>
          {custom && <div className="flex flex-wrap items-center justify-between gap-2 p-4">
            <span className="text-sm font-medium">Type</span>
            <div className="flex gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Type">
              {(["stdio", "http", "sse"] as const).map(type => {
                const index = editor.draft.configs.findIndex(option => option.type === type);
                return index < 0 ? null : <Button key={type} type="button" size="sm" role="radio" aria-checked={index === editor.draft.index} variant={index === editor.draft.index ? "outline" : "ghost"} className="h-7 px-3 text-xs" onClick={() => editor.selectConfig(index)}>{type === "stdio" ? "STDIO" : type === "http" ? "Streamable HTTP" : "SSE"}</Button>;
              })}
            </div>
          </div>}
          {!custom && editor.draft.configs.length > 1 && <div className="flex flex-wrap gap-2 p-4" aria-label="Connection options">{editor.draft.configs.map((option, index) => <Button key={index} size="sm" variant={index === editor.draft.index ? "default" : "outline"} onClick={() => editor.selectConfig(index)}>{(option.type === "http" || option.type === "sse") && <Cloud className="size-3.5" />}{option.type === "stdio" ? "Local" : "Remote"} · {option.type} {index + 1}</Button>)}</div>}
          <ConnectionFields key={`${editor.key}:${editor.draft.index}:${editor.config.type}`} config={editor.config} onChange={editor.setConfig} sectionClassName={section} showTransport={!custom} commandShortcuts={custom} />
        </div>
        {editor.draft.loadError && <p role="alert" className="text-sm text-destructive">Could not read the installed configuration: {editor.draft.loadError} <Button variant="outline" size="sm" onClick={editor.retryLoad}>Retry</Button></p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {!server.installed && <Popover>
            <PopoverTrigger asChild><Button type="button" variant="outline" disabled={saving} className="min-w-0 max-w-full gap-2" aria-label={`Installation target: ${targetLabel}. Click to change`}><span className="truncate">{targetLabel}</span><ChevronDown className="size-3.5 shrink-0" /></Button></PopoverTrigger>
            <PopoverContent align="end" side="top" className="w-96 max-w-[calc(100vw-2rem)]"><InstallationTarget /></PopoverContent>
          </Popover>}
          <Button className="shrink-0" disabled={saving || !editor.draft.loaded || !!editor.draft.loadError || (installed && !editor.draft.dirty)} onClick={save}>{saving ? "Saving..." : installed ? "Save" : "Add server"}</Button>
        </div>
      </TabsContent>
      <TabsContent value="tools" forceMount className="data-[state=inactive]:hidden"><ToolsPanel config={config} serverName={editor.draft.name.trim()} selectedClient={editor.selectedClient} workingDir={editor.selectedClient === "claude_code" ? editor.selectedProject : undefined} canConnect={complete} saveRevision={revision} /></TabsContent>
    </Tabs>
  </div>;
}
