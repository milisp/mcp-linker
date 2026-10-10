import type { ServerConfig } from "@/types";
import type { InspectorConnection, McpTool } from "../tools/types";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";

export function useMcpInspector(config: ServerConfig, workingDir?: string | null) {
  const [connection, setConnection] = useState<InspectorConnection | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [busy, setBusy] = useState<"connect" | "refresh" | "call" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const session = useRef<string | null>(null);
  const generation = useRef(0);
  const operation = useRef(false);
  const scope = JSON.stringify([config, workingDir]);
  const release = (id: string) => invoke("mcp_inspector_disconnect", { sessionId: id }).catch(() => {});

  useEffect(() => {
    generation.current += 1;
    setConnection(null); setTools([]); setResult(null); setError(null); setBusy(null);
    operation.current = false;
    return () => {
      generation.current += 1;
      if (session.current) void release(session.current);
      session.current = null;
    };
  }, [scope]);

  const connect = async () => {
    if (operation.current) return;
    operation.current = true;
    const current = ++generation.current;
    setBusy("connect"); setError(null); setResult(null);
    const previous = session.current;
    session.current = null; setConnection(null); setTools([]);
    if (previous) void release(previous);
    try {
      const data = await invoke<InspectorConnection>("mcp_inspector_connect", { config, workingDir: workingDir || undefined });
      if (generation.current !== current) { void release(data.sessionId); return; }
      session.current = data.sessionId;
      setConnection(data); setTools(data.tools);
    } catch (error) {
      if (generation.current === current) setError(error instanceof Error ? error.message : String(error));
    } finally {
      if (generation.current === current) { setBusy(null); operation.current = false; }
    }
  };
  const disconnect = () => {
    generation.current += 1;
    const id = session.current; session.current = null;
    if (id) void release(id);
    operation.current = false;
    setConnection(null); setTools([]); setResult(null); setBusy(null); setError(null);
  };
  const refresh = async () => {
    if (!session.current || operation.current) return;
    const current = generation.current;
    operation.current = true; setBusy("refresh"); setError(null);
    try {
      const tools = await invoke<McpTool[]>("mcp_inspector_list_tools", { sessionId: session.current });
      if (generation.current === current) setTools(tools);
    } catch (error) {
      if (generation.current === current) setError(error instanceof Error ? error.message : String(error));
    } finally {
      if (generation.current === current) { setBusy(null); operation.current = false; }
    }
  };
  const call = async (name: string, args: Record<string, unknown>) => {
    if (!session.current || operation.current) return;
    const current = generation.current;
    operation.current = true; setBusy("call"); setError(null); setResult(null);
    try {
      const result = await invoke("mcp_inspector_call_tool", { sessionId: session.current, name, arguments: args });
      if (generation.current === current) setResult(result);
    } catch (error) {
      if (generation.current === current) setError(error instanceof Error ? error.message : String(error));
    } finally {
      if (generation.current === current) { setBusy(null); operation.current = false; }
    }
  };
  return { connection, tools, busy, error, result, connect, disconnect, refresh, call, clearResult: () => setResult(null) };
}
