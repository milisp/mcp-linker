import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ClaudeCodeScope = "local" | "project" | "user";

export function requireLocalClaudeScope(scope: ClaudeCodeScope) {
  if (scope !== "local") throw new Error("Claude Code disabled-server operations are only supported in local scope.");
}

interface CCProjectState {
  projects: string[];
  selectedProject: string | null;
  selectedScope: ClaudeCodeScope;
  setSelectedScope: (scope: ClaudeCodeScope) => void;
  setProjects: (projects: string[]) => void;
  setSelectedProject: (project: string | null) => void;
}

export const useCCProjectStore = create<CCProjectState>()(persist((set) => ({
  projects: [],
  selectedProject: null,
  selectedScope: "local",
  setSelectedScope: (selectedScope) => set({ selectedScope }),
  setProjects: (projects) => set({ projects }),
  setSelectedProject: (project) => set({ selectedProject: project }),
}), {
  name: "claude-code-target",
  partialize: ({ selectedProject, selectedScope }) => ({ selectedProject, selectedScope }),
}));
