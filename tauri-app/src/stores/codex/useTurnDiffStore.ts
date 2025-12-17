import { create } from "zustand";

type ConversationId = string;

export interface TurnDiffState {
  diffsByConversationId: Record<ConversationId, string[]>;
  addDiff: (conversationId: ConversationId, unifiedDiff: string) => void;
  popLatestDiff: (conversationId: ConversationId) => void;
  clearConversation: (conversationId: ConversationId) => void;
}

export const useTurnDiffStore = create<TurnDiffState>((set, get) => ({
  diffsByConversationId: {},
  addDiff: (conversationId, unifiedDiff) => {
    if (!conversationId || !unifiedDiff) return;
    const current = get().diffsByConversationId[conversationId] || [];
    // Deduplicate by exact unified diff content
    if (current.includes(unifiedDiff)) return;
    const updated = { ...get().diffsByConversationId };
    updated[conversationId] = [unifiedDiff, ...current];
    set({ diffsByConversationId: updated });
  },
  popLatestDiff: (conversationId) => {
    if (!conversationId) return;
    const current = get().diffsByConversationId[conversationId] || [];
    if (current.length === 0) return;
    const updated = { ...get().diffsByConversationId };
    updated[conversationId] = current.slice(1);
    set({ diffsByConversationId: updated });
  },
  clearConversation: (conversationId) => {
    if (!conversationId) return;
    const updated = { ...get().diffsByConversationId };
    delete updated[conversationId];
    set({ diffsByConversationId: updated });
  },
}));

