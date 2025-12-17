import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CodexLayoutState {
  showHistory: boolean;
  setShowHistory: (showHistory: boolean) => void;
}

export const useCodexLayoutStore = create<CodexLayoutState>()(
  persist(
    (set) => ({
      showHistory: true,
      setShowHistory: (showHistory) => set({ showHistory }),
    }),
    {
      name: "codex-layout",
    },
  ),
);
