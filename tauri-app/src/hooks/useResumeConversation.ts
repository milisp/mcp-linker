import { useCallback } from "react";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useConversation } from "@/hooks/useCodex";
import { useBuildNewConversationParams } from "@/hooks/useBuildNewConversationParams";
import { useEventStore } from "@/stores/useEventStore";
import { extractInitialMessages, type CodexEvent } from "@/types/chat";
import { useResumeConversationStore } from "@/stores/useResumeConversationStore";
import type { ConversationSummary } from "@/bindings/ConversationSummary";

const pendingResumes = new Set<string>();

export const useResumeConversation = () => {
  const {
    addActiveConversationId,
    setActiveConversationId,
    activeConversationIds: rawActiveConversationIds,
    setActiveConversation,
  } = useActiveConversationStore();
  const { resumeConversation } = useConversation();
  const buildNewConversationParams = useBuildNewConversationParams();
  const { setEvents } = useEventStore();
  const { setResumingConversationId, clearResumingConversationId } = useResumeConversationStore();

  const handleSelectConversation = useCallback(
    async (conversation: ConversationSummary) => {
      const { conversationId, path } = conversation;
      const activeConversationIds =
        rawActiveConversationIds instanceof Set
          ? rawActiveConversationIds
          : new Set<string>();

      const shouldResume =
        !activeConversationIds.has(conversationId) ||
        activeConversationIds.size === 0;

      if (!shouldResume) {
        setActiveConversationId(conversationId);
        setActiveConversation(conversation);
        return;
      }

      if (!path) {
        setActiveConversationId(conversationId);
        setActiveConversation(conversation);
        return;
      }

      if (pendingResumes.has(conversationId)) {
        return;
      }
      setResumingConversationId(conversationId);
      pendingResumes.add(conversationId);
      try {
        console.log("Resuming conversation", conversationId, path);
        const resumedConversation = await resumeConversation(
          path,
          buildNewConversationParams,
        );
        console.log("Resumed conversation", resumedConversation);
        setActiveConversationId(resumedConversation.conversationId);
        setActiveConversation(conversation);
        addActiveConversationId(resumedConversation.conversationId);
        const initialMessages = extractInitialMessages(resumedConversation);
        const initialEvents: CodexEvent[] = [];
        if (initialMessages) {
          let currentTurn = -1;
          const baseId = Date.now();
          initialMessages.forEach(
            (msg: CodexEvent["payload"]["params"]["msg"], idx: number) => {
              if (msg.type === "user_message") {
                currentTurn += 1;
              }
              const turnId = String(currentTurn === -1 ? 0 : currentTurn);
              initialEvents.push({
                id: baseId + idx,
                event: "codex:event",
                payload: {
                  method: `codex/event/${msg.type}`,
                  params: {
                    conversationId: resumedConversation.conversationId,
                    id: turnId,
                    msg,
                  },
                },
              });
            },
          );
        }
        setEvents(resumedConversation.conversationId, initialEvents);
      } finally {
        pendingResumes.delete(conversationId);
        clearResumingConversationId();
      }
    },
    [
      rawActiveConversationIds,
      buildNewConversationParams,
      resumeConversation,
      setActiveConversationId,
      setActiveConversation,
      setEvents,
      addActiveConversationId,
      setResumingConversationId,
      clearResumingConversationId,
    ],
  );

  return { handleSelectConversation };
};
