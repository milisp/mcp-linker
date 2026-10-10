import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

interface ClaudeToolsResponse {
  name: string;
  status: "connected" | "pending" | "failed" | "needs-auth" | "disabled";
  tools: { name: string; description?: string; annotations?: { readOnly?: boolean; destructive?: boolean; openWorld?: boolean } }[];
}

export function ClaudeCodeToolsPanel({ serverName, workingDir, saveRevision }: { serverName: string; workingDir?: string | null; saveRevision: number }) {
  const [data, setData] = useState<ClaudeToolsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const generation = useRef(0);
  const busy = useRef(false);
  const id = useId();
  useEffect(() => {
    generation.current += 1; busy.current = false;
    setData(null); setError(null); setLoading(false); setSearch("");
    return () => { generation.current += 1; };
  }, [serverName, workingDir, saveRevision]);
  const load = async () => {
    if (!workingDir || !serverName || busy.current) return;
    busy.current = true; setLoading(true); setError(null); setData(null);
    const current = generation.current;
    try {
      const response = await invoke<ClaudeToolsResponse>("claude_mcp_tools", { serverName, workingDir });
      if (generation.current === current) setData(response);
    } catch (error) {
      if (generation.current === current) setError(error instanceof Error ? error.message : String(error));
    } finally {
      if (generation.current === current) { busy.current = false; setLoading(false); }
    }
  };
  const tools = data?.tools.filter(tool => `${tool.name} ${tool.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-sm font-semibold">Tools in Claude Code</h3><p className="mt-1 text-xs text-muted-foreground">{data ? `${data.status} · ${data.tools.length} tools` : "View the tools available through Claude Code."}</p></div>
      <Button size="sm" onClick={load} disabled={loading || !workingDir || !serverName}>{loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}{loading ? "Reading tools..." : data ? "Refresh tools" : "View tools"}</Button>
    </div>
    <p className="text-xs text-muted-foreground">Uses the saved server configuration in the selected project. Claude Code handles authentication. No prompt or tool call is sent.</p>
    {!workingDir && <p className="text-sm text-muted-foreground">Select a Claude Code project first.</p>}
    {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    {data?.status === "needs-auth" && <p role="status" className="text-sm">Claude Code requires authentication for this server. Open /mcp in Claude Code, sign in, then refresh tools.</p>}
    {data?.status === "failed" && <p role="status" className="text-sm">Claude Code could not connect. Check this server in /mcp, then refresh tools.</p>}
    {data?.status === "disabled" && <p className="text-sm text-muted-foreground">This server is disabled in Claude Code.</p>}
    {!!data?.tools.length && <>
      <label htmlFor={id} className="sr-only">Search tools</label>
      <input id={id} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tools..." className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
      <div className="space-y-2">{tools.map(tool => <div key={tool.name} className="rounded-lg border p-3">
        <h4 className="break-all text-sm font-semibold">{tool.name}</h4>
        {tool.description && <p className="mt-1 break-words whitespace-pre-wrap text-xs text-muted-foreground">{tool.description}</p>}
      </div>)}</div>
      {!tools.length && <p className="text-sm text-muted-foreground">No tools match your search.</p>}
    </>}
    {data?.status === "connected" && !data.tools.length && <p className="text-sm text-muted-foreground">Claude Code reports no tools for this server.</p>}
  </div>;
}
