import { useCallback, useState } from "react";
import { useConversation, useSendMessage } from "@/hooks/useCodex";
import { ChatCompose } from "./input/ChatCompose";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useCodexApprovalRequests } from "@/hooks/useCodexApprovalRequests";
import { useConversationEvents } from "@/hooks/useCodex/useConversationEvents";
import { useChatInputStore } from "@/stores/chatInputStore";
import { type CodexEvent } from "@/types/chat";
import { Introduce } from "../common/Introduce";
import { useEventStore } from "@/stores/useEventStore";
import { ChatScrollArea } from "./ChatScrollArea";
import { useTokenCountStore } from "@/stores/useTokenCountStore";
import { useTokenCount } from "@/hooks/useCodex/useTokenCount";
import { TurnDiffPanel } from "../events/TurnDiffPanel";
import { TurnDiffActions } from "../events/TurnDiffActions";
import { useTurnDiffStore } from "@/stores/useTurnDiffStore";
import { useExecCommandStore, useLayoutStore } from "@/stores";
import { useResumeConversationStore } from "@/stores/useResumeConversationStore";
import { Review } from "@/components/review";
import { ChatToolbar } from "../layout/ChatToolBar";

export function ChatView() {
  useCodexApprovalRequests();
  const { showReview } = useLayoutStore();
  const { status: conversationStatus } = useConversation();
  const { activeConversationId } = useActiveConversationStore();
  const { events, addEvent } = useEventStore();
  const { inputValue, setInputValue } = useChatInputStore();
  const setExecCommandStatus = useExecCommandStore((state) => state.setStatus);
  const [diffPanelOpen, setDiffPanelOpen] = useState(false);
  const addTurnDiff = useTurnDiffStore((s) => s.addDiff);
  const { diffsByConversationId } = useTurnDiffStore();
  const currentEvents = activeConversationId
    ? events[activeConversationId] || []
    : [];
  const { interrupt, isBusy, handleSendMessage } = useSendMessage();

  const { tokenUsages } = useTokenCountStore();
  const tokenUsage = activeConversationId
    ? tokenUsages[activeConversationId]
    : null;
  const { handleTokenCount } = useTokenCount();
  const { resumingConversationId } = useResumeConversationStore();
  const isResumingConversation = Boolean(resumingConversationId);

  // Memoize callbacks to prevent unnecessary re-subscriptions
  const handleAnyEvent = useCallback(
    (event: CodexEvent) => {
      const { params } = event.payload;
      const { conversationId, msg } = params;
      if (!conversationId) {
        return;
      }

      if (msg.type === "turn_diff") {
        const unified = msg.unified_diff as string | undefined;
        const existing = diffsByConversationId[conversationId] || [];
        if (!unified || existing.includes(unified)) {
          return; // duplicate or invalid; skip entirely
        }
        // First add to store, then record event
        addTurnDiff(conversationId, unified);
        addEvent(conversationId, event);
        return;
      }
      addEvent(conversationId, event);
    },
    [addEvent, addTurnDiff, diffsByConversationId],
  );

  const handleExecCommandEnd = useCallback(
    (event: CodexEvent) => {
      const { msg } = event.payload.params;
      if (msg.type !== "exec_command_end" || !("call_id" in msg)) {
        return;
      }
      setExecCommandStatus(msg.call_id, msg.exit_code);
    },
    [setExecCommandStatus],
  );

  useConversationEvents(activeConversationId, {
    isConversationReady: conversationStatus === "ready",
    onTokenCount: handleTokenCount,
    onAnyEvent: handleAnyEvent,
    onExecCommandEnd: handleExecCommandEnd,
  });

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
    },
    [setInputValue],
  );

  return (
    <div className="flex flex-col h-full">
      <ChatToolbar />
      {showReview ? (
        <div className="flex-1 h-full min-h-0 overflow-hidden">
          <Review />
        </div>
      ) : (
        <>
          <div className="sr-only" aria-live="polite">
            The bottom-right filter button lets you toggle which event types
            appear.
          </div>
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            {currentEvents.length > 0 || isResumingConversation ? (
              <ChatScrollArea
                events={currentEvents}
                activeConversationId={activeConversationId ?? undefined}
                isResumingConversation={isResumingConversation}
                isBusy={isBusy}
              />
            ) : (
              <Introduce />
            )}
            <TurnDiffActions
              onOpenDiffPanel={() => setDiffPanelOpen(true)}
              onCloseDiffPanel={() => setDiffPanelOpen(false)}
            />
            <ChatCompose
              inputValue={inputValue}
              onInputChange={handleInputChange}
              onSendMessage={handleSendMessage}
              onStopStreaming={() =>
                activeConversationId && interrupt(activeConversationId)
              }
              isBusy={isBusy}
              tokenUsage={tokenUsage}
            />
          </div>
          <TurnDiffPanel
            open={diffPanelOpen}
            onOpenChange={setDiffPanelOpen}
            conversationId={activeConversationId ?? undefined}
          />
        </>
      )}
    </div>
  );
}
