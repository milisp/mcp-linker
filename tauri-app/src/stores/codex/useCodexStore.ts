import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CodexState {
  cwd: string;
  webSearchEnabled: boolean;
  clientName: "codex" | "coder";
  setCwd: (cwd: string) => void;
  toggleWebSearch: () => void;
  setClientName: (name: "codex" | "coder") => void;
}

export const useCodexStore = create<CodexState>()(
  persist(
    (set) => ({
      cwd: "",
      webSearchEnabled: false,
      clientName: "codex",
      setCwd: (cwd) => set({ cwd }),
      toggleWebSearch: () =>
        set((state) => ({ webSearchEnabled: !state.webSearchEnabled })),
      setClientName: (name) => set({ clientName: name }),
    }),
    {
      name: "codex",
    },
  ),
);
