import { create } from "zustand";
import { Update } from "@tauri-apps/plugin-updater";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "up-to-date"
  | "downloading"
  | "installing"
  | "error";

interface UpdateStore {
  status: UpdateStatus;
  isChecking: boolean;
  update: Update | null;
  error: string | null;
  showDialog: boolean;
  // Download progress in bytes; total is null when the server sends no Content-Length
  downloaded: number;
  total: number | null;

  // Actions
  setStatus: (status: UpdateStatus) => void;
  setUpdate: (update: Update | null) => void;
  setError: (error: string | null) => void;
  setShowDialog: (show: boolean) => void;
  setProgress: (downloaded: number, total: number | null) => void;

  // Method to trigger manual check
  manualCheckTrigger: number;
  triggerManualCheck: () => void;
}

export const useUpdateStore = create<UpdateStore>((set) => ({
  status: "idle",
  isChecking: false,
  update: null,
  error: null,
  showDialog: false,
  downloaded: 0,
  total: null,
  manualCheckTrigger: 0,

  setStatus: (status) => set({ status, isChecking: status === "checking" }),
  setUpdate: (update) => set({ update }),
  setError: (error) => set({ error }),
  setShowDialog: (showDialog) => set({ showDialog }),
  setProgress: (downloaded, total) => set({ downloaded, total }),
  triggerManualCheck: () => set((state) => ({ manualCheckTrigger: state.manualCheckTrigger + 1 })),
}));
