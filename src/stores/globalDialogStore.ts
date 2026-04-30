import { create } from "zustand";

/**
 * GlobalDialogStore for managing global login/upgrade dialog
 */
type DialogType = "login" | "upgrade";

interface GlobalDialogState {
  open: boolean;
  type: DialogType | null;
  showDialog: (type: DialogType) => void;
  hideDialog: () => void;
}

export const useGlobalDialogStore = create<GlobalDialogState>((set) => ({
  open: false,
  type: null,
  showDialog: (type) => set({ open: true, type }),
  hideDialog: () => set({ open: false, type: null }),
}));
