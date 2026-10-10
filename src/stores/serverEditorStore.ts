import { create } from "zustand";
import type { ServerConfig } from "@/types";

export interface ServerEditorDraft {
  name: string;
  configs: ServerConfig[];
  index: number;
  dirty: boolean;
  loaded: boolean;
  persistedName?: string;
  loadError?: string;
}

// Session-only drafts let a dialog and detail page share edits without persisting credentials.
export const useServerEditorStore = create<{
  drafts: Record<string, ServerEditorDraft>;
  update: (key: string, initial: ServerEditorDraft, change: (draft: ServerEditorDraft) => ServerEditorDraft) => void;
}>((set) => ({
  drafts: {},
  update: (key, initial, change) => set(state => ({ drafts: { ...state.drafts, [key]: change(state.drafts[key] ?? initial) } })),
}));
