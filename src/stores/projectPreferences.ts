import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

type Preferences = Record<string, { visibleProjects: string[] }>;
let loading: Promise<void> | undefined;
let writes = Promise.resolve();
export const useProjectPreferences = create<{
  preferences: Preferences;
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  setVisibleProjects: (client: string, projects: string[]) => void;
}>((set, get) => ({
  preferences: {}, loaded: false, error: null,
  load: () => loading ??= invoke<{ projectPreferences?: Preferences }>("read_app_settings")
    .then(settings => {
      const preferences: Preferences = {};
      for (const [client, value] of Object.entries(settings.projectPreferences ?? {})) {
        if (Array.isArray(value?.visibleProjects) && value.visibleProjects.every(path => typeof path === "string")) preferences[client] = value;
      }
      set({ preferences, loaded: true, error: null });
    }).catch(error => { set({ error: String(error) }); loading = undefined; }),
  setVisibleProjects: (client, projects) => {
    if (!get().loaded) return;
    const preferences = { ...get().preferences, [client]: { visibleProjects: [...new Set(projects)] } };
    set({ preferences });
    writes = writes.then(() => invoke("save_project_preferences", { preferences }))
      .then(() => { set({ error: null }); }).catch(error => { set({ error: `Could not save project preferences: ${String(error)}` }); });
  },
}));
