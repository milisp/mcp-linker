export interface McpTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
}
export interface InspectorConnection {
  sessionId: string;
  serverInfo: { name?: string; version?: string; title?: string };
  capabilities: Record<string, unknown>;
  protocolVersion: string;
  tools: McpTool[];
}
export interface ToolPolicy {
  serverExists: boolean;
  enabledTools: string[] | null;
  disabledTools: string[];
}
