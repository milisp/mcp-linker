import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PromptOptimizerState {
  provider: string;
  model: string;
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
}

const DEFAULT_PROVIDER = "openai";
const DEFAULT_MODEL = "gpt-5";

export const usePromptOptimizerStore = create<PromptOptimizerState>()(
  persist(
    (set) => ({
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
    }),
    {
      name: "prompt-optimizer",
    },
  ),
);
