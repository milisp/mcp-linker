import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useApprovalStore } from "@/stores";
import type { CodexEvent } from "@/types/chat";
import { invoke } from "@tauri-apps/api/core";
import { memo, useState } from "react";
import { EventBubble } from "./EventBubble";

type ExecDecision = "approved" | "approved_for_session" | "denied" | "abort";

export const ExecApprovalRequestItem = memo(function ExecApprovalRequestItem({
  event,
  conversationId,
}: {
  event: CodexEvent;
  conversationId: string | null;
}) {
  const { msg } = event.payload.params;
  if (msg.type !== "exec_approval_request") {
    return null;
  }
  console.log(msg);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const execApprovalRequest = useApprovalStore((state) => {
    if (msg.type !== "exec_approval_request") {
      return null;
    }
    const entry = state.execRequests[msg.call_id] ?? null;
    console.debug(entry);
    if (!entry) {
      return null;
    }
    console.debug(conversationId);
    if (conversationId && entry.conversationId !== conversationId) {
      return null;
    }
    return entry;
  });
  const { removeExecRequest } = useApprovalStore();

  const handleExecDecision = async (decision: ExecDecision) => {
    if (!execApprovalRequest || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await invoke("respond_exec_command_request", {
        requestToken: execApprovalRequest.requestToken,
        decision,
      });
      removeExecRequest(execApprovalRequest.callId);
      const decisionLabel: Record<ExecDecision, string> = {
        approved: "approved",
        approved_for_session: "approved for this session",
        denied: "denied",
        abort: "aborted",
      };
      toast({
        title: "Decision submitted",
        description: `You ${decisionLabel[decision]} the command.`,
      });
    } catch (error) {
      console.error("Failed to send exec approval decision", error);
      const description =
        error instanceof Error ? error.message : String(error);
      toast({
        title: "Failed to send approval",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const commandText = msg.command.join(" ");
  const awaitingDecision = Boolean(execApprovalRequest);
  return (
    <EventBubble align="start" variant="system">
      <div className="space-y-3">
        <div className="space-y-1">
          <code className="block whitespace-pre-wrap rounded bg-muted/50 px-2 py-1 font-mono text-xs">
            {commandText}
          </code>
        </div>
        {awaitingDecision && (
          <div className="space-y-3 border-t border-border/50 pt-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleExecDecision("approved")}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => handleExecDecision("approved_for_session")}
              >
                Approve for session
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => handleExecDecision("denied")}
              >
                Deny
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isSubmitting}
                onClick={() => handleExecDecision("abort")}
              >
                Abort turn
              </Button>
            </div>
            {isSubmitting ? (
              <div className="text-xs text-muted-foreground">
                Sending decision…
              </div>
            ) : null}
          </div>
        )}
      </div>
    </EventBubble>
  );
});
