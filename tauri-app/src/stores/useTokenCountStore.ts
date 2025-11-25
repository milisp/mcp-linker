import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type TokenUsage } from "@/bindings/TokenUsage";

interface TokenCountState {
  tokenUsages: Record<string, TokenUsage | null>;
  setTokenUsage: (conversationId: string, tokenUsage: TokenUsage | null) => void;
  clearTokenUsage: (conversationId: string) => void;
}

export const useTokenCountStore = create<TokenCountState>()(
  persist(
    (set) => ({
      tokenUsages: {},
      setTokenUsage: (conversationId, tokenUsage) =>
        set((state) => ({
          tokenUsages: {
            ...state.tokenUsages,
            [conversationId]: tokenUsage,
          },
        })),
      clearTokenUsage: (conversationId) =>
        set((state) => {
          const newTokenUsages = { ...state.tokenUsages };
          delete newTokenUsages[conversationId];
          return { tokenUsages: newTokenUsages };
        }),
    }),
    {
      name: "token-count-storage",
    },
  ),
);
