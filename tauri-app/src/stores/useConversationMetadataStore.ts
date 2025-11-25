import { create } from "zustand";
import { ReasoningEffort } from "@/bindings/ReasoningEffort";

export interface ConversationMetadata {
  model: string | null;
  reasoningEffort: ReasoningEffort | null;
  rolloutPath: string | null;
  status: "idle" | "initializing" | "ready" | "error";
  error: string | null;
}

type MetadataUpdater =
  | Partial<ConversationMetadata>
  | ((prev: ConversationMetadata) => ConversationMetadata);

interface ConversationMetadataState {
  metadata: ConversationMetadata;
  setMetadata: (updater: MetadataUpdater) => void;
  resetMetadata: () => void;
}

const createDefaultMetadata = (): ConversationMetadata => ({
  model: null,
  reasoningEffort: null,
  rolloutPath: null,
  status: "idle",
  error: null,
});

export const useConversationMetadataStore = create<ConversationMetadataState>(
  (set) => ({
    metadata: createDefaultMetadata(),
    setMetadata: (updater) =>
      set((state) => ({
        metadata:
          typeof updater === "function"
            ? updater(state.metadata)
            : { ...state.metadata, ...updater },
      })),
    resetMetadata: () => set({ metadata: createDefaultMetadata() }),
  }),
);
