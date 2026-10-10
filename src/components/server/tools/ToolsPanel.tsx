import { Button } from "@/components/ui/button";
import type { ServerConfig } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Plug, RefreshCw, Unplug } from "lucide-react";
import { useMcpInspector } from "../hooks/useMcpInspector";
import type { ToolPolicy } from "./types";

const EMPTY_POLICY: ToolPolicy = { serverExists: false, enabledTools: null, disabledTools: [] };

export function ToolsPanel({ config, serverName, selectedClient, workingDir, canConnect, saveRevision }: {
  config: ServerConfig; serverName: string; selectedClient: string; workingDir?: string | null; canConnect: boolean; saveRevision: number;
}) {
  const inspector = useMcpInspector(config, workingDir);
  const id = useId();
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [argumentsText, setArgumentsText] = useState("{}");
  const [argumentsError, setArgumentsError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<ToolPolicy>(EMPTY_POLICY);
  const [policyDirty, setPolicyDirty] = useState(false);
  const [policyBusy, setPolicyBusy] = useState(false);
  const [policyLoaded, setPolicyLoaded] = useState(false);
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);
  const policyScope = `${selectedClient}:${serverName}`;

  const policyGeneration = useRef(0);
  useEffect(() => { setSelectedName(""); setArgumentsText("{}"); setArgumentsError(null); }, [JSON.stringify([config, workingDir])]);

  useEffect(() => {
    policyGeneration.current += 1;
    let cancelled = false;
    setPolicy(EMPTY_POLICY); setPolicyDirty(false); setPolicyLoaded(false); setPolicyMessage(null); setPolicyBusy(false);
    if (selectedClient !== "codex") return;
    invoke<ToolPolicy>("codex_get_tool_policy", { serverName }).then(policy => {
      if (!cancelled) { setPolicy(policy); setPolicyLoaded(true); }
    }).catch(error => { if (!cancelled) setPolicyMessage(error instanceof Error ? error.message : String(error)); });
    return () => { cancelled = true; };
  }, [policyScope, saveRevision, selectedClient, serverName]);

  const selected = inspector.tools.find(tool => tool.name === selectedName);
  const visible = inspector.tools.filter(tool => `${tool.name} ${tool.description ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const enabled = (name: string) => !policy.disabledTools.includes(name) && (policy.enabledTools === null || policy.enabledTools.includes(name));
  const toggleTool = (name: string, allow: boolean) => {
    setPolicy(policy => ({ ...policy,
      enabledTools: policy.enabledTools === null ? null : allow ? [...new Set([...policy.enabledTools, name])] : policy.enabledTools.filter(tool => tool !== name),
      disabledTools: allow ? policy.disabledTools.filter(tool => tool !== name) : [...new Set([...policy.disabledTools, name])],
    }));
    setPolicyDirty(true); setPolicyMessage(null);
  };
  const savePolicy = async () => {
    if (!policy.serverExists || policyBusy) return;
    const generation = policyGeneration.current;
    setPolicyBusy(true); setPolicyMessage(null);
    try {
      const saved = await invoke<ToolPolicy>("codex_set_tool_policy", { serverName, enabledTools: policy.enabledTools, disabledTools: policy.disabledTools });
      if (generation !== policyGeneration.current) return;
      setPolicy(saved); setPolicyDirty(false); setPolicyMessage("Tool access saved. Reload the server or start a new Codex session to apply it.");
    } catch (error) { if (generation === policyGeneration.current) setPolicyMessage(error instanceof Error ? error.message : String(error)); }
    finally { if (generation === policyGeneration.current) setPolicyBusy(false); }
  };
  const run = async () => {
    if (!selected) return;
    let args: unknown;
    try { args = JSON.parse(argumentsText); } catch { setArgumentsError("Enter valid JSON arguments."); return; }
    if (args === null || typeof args !== "object" || Array.isArray(args)) { setArgumentsError("Arguments must be a JSON object."); return; }
    const required = Array.isArray(selected.inputSchema.required) ? selected.inputSchema.required.filter((name): name is string => typeof name === "string") : [];
    const missing = required?.filter(name => !(name in (args as Record<string, unknown>)));
    if (missing?.length) { setArgumentsError(`Missing required arguments: ${missing.join(", ")}`); return; }
    setArgumentsError(null);
    await inspector.call(selected.name, args as Record<string, unknown>);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 break-words"><h3 className="text-sm font-semibold">Connection & tools</h3><p className="mt-1 text-xs text-muted-foreground">{inspector.connection ? `${inspector.connection.serverInfo.title ?? inspector.connection.serverInfo.name ?? "Connected"} · ${inspector.tools.length} tools · ${inspector.connection.protocolVersion}` : "Connect to discover the server's actual tools."}</p></div>
        <div className="flex flex-wrap gap-2">
          {inspector.connection && <Button type="button" size="sm" variant="outline" disabled={!!inspector.busy} onClick={inspector.refresh}><RefreshCw className="size-3.5" /> Refresh</Button>}
          <Button type="button" size="sm" disabled={!canConnect || !!inspector.busy} onClick={inspector.connect}>
            {inspector.busy === "connect" ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}{inspector.connection ? "Reconnect" : "Connect & list tools"}
          </Button>
          {inspector.connection && <Button type="button" size="sm" variant="outline" onClick={inspector.disconnect}><Unplug className="size-3.5" /> Disconnect</Button>}
        </div>
      </div>
      {!canConnect && <p className="text-sm text-amber-700 dark:text-amber-400">Complete the connection fields and credentials first.</p>}
      {config.type === "stdio" && <p className="text-xs text-muted-foreground">Connecting starts the configured local command. Disconnecting stops the inspection process.</p>}
      <p className="text-xs text-muted-foreground">Connecting only reads server information and tool definitions. Tool tests run only when you click Run tool.</p>
      {inspector.error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{inspector.error}</p>}
      {inspector.connection && !inspector.tools.length && <p className="text-sm text-muted-foreground">This server does not advertise any tools.</p>}
      {inspector.tools.length > 0 && <>
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <h4 className="text-sm font-medium">Tool access in {selectedClient === "codex" ? "Codex" : "your client"}</h4>
          {selectedClient === "codex" ? <>
            <p className="text-xs text-muted-foreground">Choose which tools Codex can use. Changes take effect after saving and reloading Codex, and do not restrict this inspection session.</p>
            {policyLoaded && !policy.serverExists && <p className="text-xs">Add this server to Codex in the Connection tab before saving tool access.</p>}
            <Button type="button" variant="outline" size="sm" disabled={!policyLoaded || !policy.serverExists || !policyDirty || policyBusy} onClick={savePolicy}>{policyBusy && <Loader2 className="size-3.5 animate-spin" />} Save tool access</Button>
            {policyMessage && <p role="status" className="text-xs">{policyMessage}</p>}
          </> : <p className="text-xs text-muted-foreground">Tool availability and approval are controlled in this client. MCP Linker can inspect and test tools here; it does not change that client's tool permissions.</p>}
        </div>
        <label htmlFor={`${id}-search`} className="sr-only">Search tools</label>
        <input id={`${id}-search`} placeholder="Search tools..." value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
        <div className="space-y-2">
          {visible.map(tool => <div key={tool.name} className={`flex items-start gap-3 rounded-lg border p-3 ${selectedName === tool.name ? "border-primary" : ""}`}>
            {selectedClient === "codex" && <input type="checkbox" aria-label={`Allow ${tool.name} in Codex`} checked={enabled(tool.name)} disabled={!policyLoaded || !policy.serverExists || policyBusy} onChange={event => toggleTool(tool.name, event.target.checked)} className="mt-1" />}
            <button type="button" className="min-w-0 flex-1 text-left" aria-label={`Inspect tool ${tool.name}`} onClick={() => { setSelectedName(tool.name); setArgumentsText("{}"); setArgumentsError(null); inspector.clearResult(); }}>
              <span className="block break-all text-sm font-semibold">{tool.title ?? tool.name}</span>
              {tool.description && <span className="mt-1 block text-xs text-muted-foreground">{tool.description}</span>}
              <span className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                {tool.annotations?.readOnlyHint === true && <span>Declared read-only</span>}
                {tool.annotations?.destructiveHint === true && <span className="text-amber-700 dark:text-amber-400">Declared destructive</span>}
                {tool.annotations?.openWorldHint === true && <span>External access</span>}
                {!tool.annotations && <span>Effects not declared</span>}
              </span>
            </button>
          </div>)}
          {!visible.length && <p className="text-sm text-muted-foreground">No tools match your search.</p>}
        </div>
      </>}
      {selected && <section className="rounded-lg border p-4 space-y-3" aria-label={`Test ${selected.name}`}>
        <h4 className="break-all text-sm font-semibold">{selected.name}</h4>
        <details><summary className="cursor-pointer text-sm">Input schema</summary><pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(selected.inputSchema, null, 2)}</pre></details>
        {selected.outputSchema && <details><summary className="cursor-pointer text-sm">Output schema</summary><pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(selected.outputSchema, null, 2)}</pre></details>}
        <label htmlFor={`${id}-arguments`} className="block text-sm font-medium">Arguments (JSON)</label>
        <textarea id={`${id}-arguments`} className="min-h-28 w-full rounded-md border bg-transparent p-3 font-mono text-xs" value={argumentsText} onChange={event => { setArgumentsText(event.target.value); setArgumentsError(null); }} />
        {argumentsError && <p role="alert" className="text-sm text-destructive">{argumentsError}</p>}
        <p className="text-xs text-muted-foreground">This calls the live server with these arguments and can change data. Server annotations are declarations, not safety guarantees.</p>
        <Button type="button" size="sm" disabled={!!inspector.busy || !inspector.connection} onClick={run}>{inspector.busy === "call" && <Loader2 className="size-3.5 animate-spin" />} Run tool</Button>
        {inspector.result !== null && <div><h5 className="mb-2 text-sm font-medium">Result</h5><pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(inspector.result, null, 2)}</pre></div>}
      </section>}
    </div>
  );
}
