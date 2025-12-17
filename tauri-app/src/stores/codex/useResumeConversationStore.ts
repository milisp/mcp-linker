import { create } from "zustand";

interface ResumeConversationState {
  resumingConversationId: string | null;
  setResumingConversationId: (conversationId: string | null) => void;
  clearResumingConversationId: () => void;
}

export const useResumeConversationStore = create<ResumeConversationState>((set) => ({
  resumingConversationId: null,
  setResumingConversationId: (conversationId) => set({ resumingConversationId: conversationId }),
  clearResumingConversationId: () => set({ resumingConversationId: null }),
}));
