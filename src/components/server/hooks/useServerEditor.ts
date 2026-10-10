import { normalizeServerConfig } from "../utils/normalizeServerConfig";
import { useCCProjectStore } from "@/stores/ccProject";
import { useClientPathStore } from "@/stores/clientPathStore";
import { useServerEditorStore, type ServerEditorDraft } from "@/stores/serverEditorStore";
import type { ServerConfig, ServerType } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";

export function useServerEditor(server: ServerType) {
  const [loadRevision, setLoadRevision] = useState(0);
  const { selectedClient, selectedPath } = useClientPathStore();
  const selectedProject = useCCProjectStore(state => state.selectedProject);
  const key = JSON.stringify([server.id || server.name, selectedClient, selectedPath, selectedClient === "claude_code" ? selectedProject : null]);
  const initial = useMemo<ServerEditorDraft>(() => ({
    name: server.installed?.name ?? (server.id.split("/").pop() || server.name),
    configs: structuredClone(server.configs?.some(config => config.type !== "encrypted") ? server.configs.filter(config => config.type !== "encrypted") : [{ type: "stdio", command: "", args: [], env: {} }]),
    index: 0,
    dirty: false,
    loaded: !!server.installed,
    persistedName: server.installed?.name,
  }), [server]);
  const stored = useServerEditorStore(state => state.drafts[key]);
  const draft = stored ?? initial;
  const update = (change: (draft: ServerEditorDraft) => ServerEditorDraft) => useServerEditorStore.getState().update(key, initial, change);

  useEffect(() => {
    useServerEditorStore.getState().update(key, initial, draft => server.installed && !draft.dirty ? initial : draft);
    if (useServerEditorStore.getState().drafts[key]?.loaded) return;
    const load = async () => {
      try {
        let existing: ServerConfig | null = null;
        if (selectedClient === "claude_code") {
          if (selectedProject) {
            const list = await invoke<Record<string, unknown>[]>("claude_mcp_list", { workingDir: selectedProject });
            const entry = list.find(entry => entry.name === initial.name);
            if (entry) existing = normalizeServerConfig(entry);
          }
        } else if (!(selectedClient === "custom" && !selectedPath)) {
          const data = await invoke<{ mcpServers?: Record<string, Record<string, unknown>> }>("read_json_file", { clientName: selectedClient, path: selectedPath || undefined });
          if (data.mcpServers?.[initial.name]) existing = normalizeServerConfig(data.mcpServers[initial.name]);
        }
        useServerEditorStore.getState().update(key, initial, draft => {
          if (!existing) return { ...draft, loaded: true };
          if (draft.dirty) return { ...draft, loaded: true, persistedName: initial.name };
          const configs = [...draft.configs];
          let index = configs.findIndex(config => config.type === existing!.type);
          if (index < 0) { index = configs.length; configs.push(existing!); }
          else configs[index] = existing!;
          return { ...draft, configs, index, loaded: true, persistedName: initial.name };
        });
      } catch (error) {
        useServerEditorStore.getState().update(key, initial, draft => ({ ...draft, loaded: true, loadError: error instanceof Error ? error.message : String(error) }));
      }
    };
    void load();
  }, [key, initial, selectedClient, selectedPath, selectedProject, loadRevision, server.installed]);

  const config = draft.configs[draft.index];
  const setConfig = (config: ServerConfig) => update(draft => ({ ...draft, dirty: true, configs: draft.configs.map((current, index) => index === draft.index ? config : current) }));
  return {
    key, draft, config, selectedClient, selectedPath, selectedProject,
    setName: (name: string) => update(draft => ({ ...draft, name, dirty: true })),
    selectConfig: (index: number) => update(draft => ({ ...draft, index })),
    setConfig,
    retryLoad: () => { update(draft => ({ ...draft, loaded: false, loadError: undefined })); setLoadRevision(value => value + 1); },
    markSaved: () => update(draft => ({ ...draft, dirty: false, persistedName: draft.name, loadError: undefined })),
  };
}
