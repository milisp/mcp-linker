import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  excludeFolders: string[];
  addExcludeFolder: (folder: string) => void;
  removeExcludeFolder: (folder: string) => void;
  setExcludeFolders: (folders: string[]) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  autoCommitGitWorktree: boolean;
  setAutoCommitGitWorktree: (enabled: boolean) => void;
  enableTaskCompleteBeep: boolean;
  setEnableTaskCompleteBeep: (enabled: boolean) => void;
  preventSleepDuringTasks: boolean;
  setPreventSleepDuringTasks: (enabled: boolean) => void;
}

const DEFAULT_EXCLUDE_FOLDERS = [
  ".git",
  "node_modules",
  ".venv",
  "__pycache__",
  ".next",
  ".nuxt",
  "dist",
  "build",
  ".DS_Store",
  "target",
  ".cargo",
];


export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, _get) => ({
      excludeFolders: DEFAULT_EXCLUDE_FOLDERS,
      activeSection: "promptOptimizer",
      autoCommitGitWorktree: true,
      enableTaskCompleteBeep: true,
      preventSleepDuringTasks: true,
      addExcludeFolder: (folder: string) =>
        set((state) => ({
          excludeFolders: [...state.excludeFolders, folder],
        })),
      removeExcludeFolder: (folder: string) =>
        set((state) => ({
          excludeFolders: state.excludeFolders.filter((f) => f !== folder),
        })),
      setExcludeFolders: (folders: string[]) =>
        set({ excludeFolders: folders }),
      setActiveSection: (section: string) =>
        set({ activeSection: section }),
      setAutoCommitGitWorktree: (enabled: boolean) => set({ autoCommitGitWorktree: enabled }),
      setEnableTaskCompleteBeep: (enabled: boolean) => set({ enableTaskCompleteBeep: enabled }),
      setPreventSleepDuringTasks: (enabled: boolean) =>
        set({ preventSleepDuringTasks: enabled }),
    }),
    {
      name: "settings-storage",
    },
  ),
);
