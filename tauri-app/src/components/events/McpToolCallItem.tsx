import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { CodexEvent } from "@/types/chat";
import { useEventStore } from "@/stores/useEventStore";
import { Badge } from "@/components/ui/badge";
import { DiffViewer } from "@/components/DiffViewer";

export function McpToolCallItem({ event }: { event: CodexEvent }) {
  const { msg, conversationId } = event.payload.params;
  if (msg.type !== "mcp_tool_call_begin" && msg.type !== "mcp_tool_call_end") {
    return null;
  }

  const callId = msg.call_id;
  const conversationEvents = useEventStore(
    (state) => state.events[conversationId] ?? [],
  );
  const endMsg = useMemo(() => {
    if (msg.type === "mcp_tool_call_end") return msg;
    for (let i = conversationEvents.length - 1; i >= 0; i -= 1) {
      const candidate = conversationEvents[i]?.payload.params.msg;
      if (
        candidate?.type === "mcp_tool_call_end" &&
        "call_id" in candidate &&
        candidate.call_id === callId
      ) {
        return candidate;
      }
    }
    return null;
  }, [callId, conversationEvents, msg]);

  const invocationArgs = msg.invocation.arguments;

  function extractArg(
    info: unknown,
    key: "path" | "content",
  ): string | undefined {
    if (typeof info === "string" && key === "content") return info;
    if (
      info &&
      typeof info === "object" &&
      !Array.isArray(info) &&
      key in info &&
      typeof (info as any)[key] === "string"
    ) {
      return (info as any)[key];
    }
    return undefined;
  }

  const invocationPath = extractArg(invocationArgs, "path");
  const invocationContent = extractArg(invocationArgs, "content");
  const okResult =
    endMsg && "result" in endMsg && "Ok" in endMsg.result
      ? endMsg.result.Ok
      : null;
  const errorMessage =
    endMsg && "result" in endMsg && "Err" in endMsg.result
      ? endMsg.result.Err
      : null;

  return (
    <div>
      <div className="flex gap-2 items-center">
        <Badge>{msg.invocation.server}</Badge>
        <Badge>{msg.invocation.tool}</Badge>
        {typeof invocationPath === "string" && <Badge>{invocationPath}</Badge>}
        {okResult && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {errorMessage && (
          <span className="text-destructive text-sm leading-tight">
            {errorMessage}
          </span>
        )}
      </div>
      {typeof invocationContent === "string" && (
        <div className="overflow-auto max-h-96">
          <DiffViewer unifiedDiff={invocationContent} />
        </div>
      )}
    </div>
  );
}
