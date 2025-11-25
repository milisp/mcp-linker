import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useTokenCountStore } from "@/stores/useTokenCountStore";
import { type CodexEvent } from "@/types/chat";

export function useTokenCount() {
  const { activeConversationId } = useActiveConversationStore();
  const { setTokenUsage } = useTokenCountStore();

  const handleTokenCount = (event: CodexEvent) => {
    const { msg } = event.payload.params;
    if (msg.type !== "token_count") {
      return;
    }

    const usage = msg.info?.total_token_usage ?? null;

    const conversationId = event.payload.params.conversationId ?? activeConversationId;
    if (!conversationId) {
      return;
    }

    if (usage && typeof usage.total_tokens === "number") {
      setTokenUsage(conversationId, { ...usage });
    } else {
      setTokenUsage(conversationId, null);
    }
  };

  return {
    handleTokenCount,
  };
}
