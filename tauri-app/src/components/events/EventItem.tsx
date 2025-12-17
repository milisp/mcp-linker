import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { MsgFooter } from "@/components/chat/messages/MsgFooter";
import { PlanDisplay } from "@/components/chat/messages/PlanDisplay";
import { Badge } from "@/components/ui/badge";
import { useSessionStore } from "@/stores/codex/useSessionStore";
import { useTurnDiffStore } from "@/stores/useTurnDiffStore";
import { CodexEvent } from "@/types/chat";
import { formatDurationMs } from "@/utils/formatDuration";
import { getStreamDurationLabel } from "@/utils/getDurationLable";
import { Dot } from "lucide-react";
import { memo } from "react";
import { AccordionMsg } from "./AccordionMsg";
import { ApplyPatchApprovalRequestItem } from "./ApplyPatchApprovalRequestItem";
import { ExecApprovalRequestItem } from "./ExecApprovalRequestItem";
import { ExecCommandBeginItem } from "./ExecCommandBeginItem";
import { McpToolCallItem } from "./McpToolCallItem";
import { PatchApplyBeginItem } from "./PatchApplyBeginItem";
import { TurnDiffView } from "./TurnDiffView";
import { UserMessage } from "./UserMessage";

export const EVENT_FILTER_OPTIONS = [
  { type: "agent_message", label: "Agent messages" },
  { type: "agent_reasoning", label: "Agent reasoning" },
  { type: "agent_reasoning_raw_content", label: "Reasoning" },
  { type: "exec_command_begin", label: "Exec command" },
  { type: "mcp_tool_call_begin", label: "Mcp tool call" },
  { type: "patch_apply_begin", label: "Patch apply" },
  { type: "exec_approval_request", label: "Exec approval requests" },
  { type: "apply_patch_approval_request", label: "Patch approval requests" },
  { type: "turn_diff", label: "Turn diffs" },
  { type: "plan_update", label: "Plan" },
  { type: "task_complete", label: "Task completions" },
] as const;

export type EventFilterType = (typeof EVENT_FILTER_OPTIONS)[number]["type"];

export const EventItem = memo(function EventItem({
  event,
  conversationId,
}: {
  event: CodexEvent;
  conversationId: string | null;
}) {
  const { msg } = event.payload.params;
  const durationLabel = getStreamDurationLabel(event);
  const { diffsByConversationId } = useTurnDiffStore();
  const busyState = useSessionStore((state) =>
    conversationId ? state.busyByConversationId[conversationId] : undefined,
  );
  const canUndo =
    !!conversationId &&
    (diffsByConversationId[conversationId]?.length || 0) > 0;

  if (msg.type.endsWith("_delta")) return null;
  switch (msg.type) {
    case "user_message": {
      const messageText = msg.message;
      return (
        <UserMessage
          message={messageText}
          conversationId={conversationId}
          canUndo={canUndo}
        />
      );
    }
    case "agent_message": {
      const messageText = msg.message;
      return (
        <div>
          <div className="flex peer items-start">
            <MarkdownRenderer content={messageText} />
          </div>
          <div className="opacity-0 transition-opacity duration-200 peer-hover:opacity-100 hover:opacity-100">
            <MsgFooter
              content={messageText}
              align="start"
              metaInfo={durationLabel}
            />
          </div>
        </div>
      );
    }
    case "agent_reasoning":
    case "agent_reasoning_raw_content":
      return (
        <div className="flex gap-2 items-center">
          <Dot size={12} />
          <span className="flex">
            {msg.text.includes("\n") ? (
              (() => {
                const firstNewlineIndex = msg.text.indexOf("\n");
                const title = msg.text.substring(0, firstNewlineIndex);
                const content = msg.text.substring(firstNewlineIndex + 1);
                return <AccordionMsg title={title} content={content} />;
              })()
            ) : (
              <MarkdownRenderer content={msg.text} />
            )}
          </span>
          {durationLabel && (
            <p className="text-xs text-muted-foreground">{durationLabel}</p>
          )}
        </div>
      );
    case "exec_approval_request":
      return (
        <ExecApprovalRequestItem
          event={event}
          conversationId={conversationId}
        />
      );
    case "apply_patch_approval_request":
      return (
        <ApplyPatchApprovalRequestItem
          event={event}
          conversationId={conversationId}
        />
      );
    case "turn_aborted":
      return <Badge variant="destructive">{msg.reason}</Badge>;
    case "turn_diff":
      return <TurnDiffView content={msg.unified_diff} />;
    case "plan_update":
      return <PlanDisplay steps={msg.plan} />;
    case "exec_command_begin":
      return <ExecCommandBeginItem event={event} />;
    case "patch_apply_begin":
      return <PatchApplyBeginItem event={event} />;
    case "mcp_tool_call_begin":
      return <McpToolCallItem event={event} />;
    case "patch_apply_end":
    case "exec_command_end":
    case "mcp_tool_call_end":
    case "task_started":
    case "token_count":
    case "item_started":
    case "item_completed":
    case "agent_reasoning_section_break":
    case "session_configured":
    case "mcp_startup_complete":
    case "mcp_startup_update":
      return null;
    case "task_complete": {
      const taskDuration =
        busyState?.lastDurationMs !== null &&
        busyState?.lastDurationMs !== undefined
          ? formatDurationMs(busyState.lastDurationMs)
          : null;
      return (
        <div className="text-xs text-muted-foreground font-mono">
          Worked for{taskDuration ? ` in ${taskDuration}` : ""}
        </div>
      );
    }
    case "error":
    case "stream_error":
      return <Badge variant="destructive">{msg.message}</Badge>;
    case "warning":
      return (
        <p className="bg-yellow-200 dark:bg-yellow-700 rounded p-1">
          {msg.message}
        </p>
      );
    default:
      return (
        <AccordionMsg title={msg.type} content={JSON.stringify(msg, null, 2)} />
      );
  }
});
