import { create } from "zustand";

/** Whether a project-capable client (Cursor, VS Code) targets its user config or a project folder. */
export type TargetScope = "user" | "project";

interface ClientPathState {
  selectedClient: string;
  /** The path operations use: null while the user config is targeted. */
  selectedPath: string | null;
  selectedScope: TargetScope;
  setSelectedClient: (client: string) => void;
  /** A path selects the project scope; null selects the user config. */
  setSelectedPath: (path: string | null) => void;
  /** Switches to the user config, or back to the remembered project path if there is one. */
  setSelectedScope: (scope: TargetScope) => void;
  getClientPath: (client: string) => string | null;
  setClientPath: (client: string, path: string | null) => void;
}

const read = (key: string) => (typeof window !== "undefined" ? localStorage.getItem(key) : null);
const write = (key: string, value: string | null) => {
  if (typeof window === "undefined") return;
  if (value) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
};

const getInitialClient = () => read("selectedClient") || "claude";
// The last chosen path is remembered per client even while the user config is targeted.
const getClientPathFromStorage = (client: string) => read(`clientPath_${client}`);
const getScope = (client: string): TargetScope => {
  const saved = read(`clientScope_${client}`);
  if (saved === "user" || saved === "project") return saved;
  return getClientPathFromStorage(client) ? "project" : "user";
};
// The project scope always has a path; without one the user config is the target.
const targetOf = (client: string): { selectedScope: TargetScope; selectedPath: string | null } => {
  const path = getClientPathFromStorage(client);
  return getScope(client) === "project" && path ? { selectedScope: "project", selectedPath: path } : { selectedScope: "user", selectedPath: null };
};

export const useClientPathStore = create<ClientPathState>((set, get) => ({
  selectedClient: getInitialClient(),
  ...targetOf(getInitialClient()),
  setSelectedClient: (client) => {
    if (get().selectedClient === client) return;
    write("selectedClient", client);
    set({ selectedClient: client, ...targetOf(client) });
  },
  setSelectedPath: (path) => {
    const { selectedClient } = get();
    if (path) write(`clientPath_${selectedClient}`, path);
    write(`clientScope_${selectedClient}`, path ? "project" : "user");
    set(targetOf(selectedClient));
  },
  setSelectedScope: (scope) => {
    const { selectedClient } = get();
    write(`clientScope_${selectedClient}`, scope);
    set(targetOf(selectedClient));
  },
  getClientPath: (client) => getClientPathFromStorage(client),
  setClientPath: (client, path) => {
    write(`clientPath_${client}`, path);
    if (get().selectedClient === client) set(targetOf(client));
  },
}));
