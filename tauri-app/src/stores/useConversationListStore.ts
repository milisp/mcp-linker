import type { ConversationSummary } from "@/bindings/ConversationSummary";
import type { SessionSource } from "@/bindings/SessionSource";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

const KNOWN_SESSION_SOURCES: readonly SessionSource[] = [
  "cli",
  "vscode",
  "exec",
  "mcp",
  "unknown",
];

function normalizeSessionSource(value: unknown): SessionSource {
  if (typeof value === "string") {
    if (KNOWN_SESSION_SOURCES.includes(value as SessionSource)) {
      return value as SessionSource;
    }
    return "unknown";
  }

  if (typeof value === "object" && value !== null && "subagent" in value) {
    return value as SessionSource;
  }

  return "unknown";
}

function buildConversationSummary(
  summary: ConversationSummary,
  cwdFallback: string,
): ConversationSummary {
  return {
    conversationId: summary.conversationId,
    path: summary.path ?? "",
    preview: summary.preview ?? "",
    timestamp:
      typeof summary.timestamp === "string" ? summary.timestamp : null,
    modelProvider: summary.modelProvider ?? "",
    cwd: summary.cwd ?? cwdFallback ?? "",
    cliVersion: summary.cliVersion ?? "",
    source: normalizeSessionSource(summary.source),
    gitInfo: summary.gitInfo ?? null,
  };
}

interface ConversationListState {
  conversationsByCwd: Record<string, ConversationSummary[]>;
  conversationIndex: Record<string, string>;
  favoriteConversationIdsByCwd: Record<string, string[]>;
  loadedAllByCwd: Record<string, boolean>;
  hasMoreByCwd: Record<string, boolean>;
}

interface ConversationListActions {
  addConversation: (cwd: string, summary: ConversationSummary) => Promise<void>;
  updateConversationPreview: (conversationId: string, preview: string) => void;
  removeConversation: (conversationId: string) => Promise<void>;
  setFavorite: (conversationId: string, isFavorite: boolean) => Promise<void>;
  toggleFavorite: (conversationId: string) => Promise<void>;
  reset: () => void;
}

async function syncFavoritesToBackend(cwd: string) {
  const state = useConversationListStore.getState();
  const favorites = state.favoriteConversationIdsByCwd[cwd] ?? [];
  await invoke("update_project_favorites", {
    projectPath: cwd,
    favorites,
  });
}

async function removeConversationFromBackend(cwd: string, conversationId: string) {
  await invoke("remove_project_session", { projectPath: cwd, conversationId });
}

export const useConversationListStore = create<
  ConversationListState & ConversationListActions
>()(
  (set, get) => ({
    conversationsByCwd: {},
    conversationIndex: {},
    favoriteConversationIdsByCwd: {},
    loadedAllByCwd: {},
    hasMoreByCwd: {},

    addConversation: async (cwd, summary: ConversationSummary) => {
      set((state) => {
        const existingList = state.conversationsByCwd[cwd] ?? [];
        const normalizedSummary = buildConversationSummary(summary, cwd);
        const index = existingList.findIndex(
          (item) =>
            item.conversationId === normalizedSummary.conversationId,
        );
        const existingItem = index >= 0 ? existingList[index] : null;
        const summaryWithTimestamp: ConversationSummary = {
          ...normalizedSummary,
          timestamp:
            normalizedSummary.timestamp ??
            existingItem?.timestamp ??
            new Date().toISOString(),
        };
        const mergedConversation =
          existingItem === null
            ? summaryWithTimestamp
            : { ...existingItem, ...summaryWithTimestamp };
        const nextList = [
          mergedConversation,
          ...existingList.filter(
            (item) => item.conversationId !== summaryWithTimestamp.conversationId,
          ),
        ];

        return {
          conversationsByCwd: {
            ...state.conversationsByCwd,
            [cwd]: nextList,
          },
          conversationIndex: {
            ...state.conversationIndex,
            [summaryWithTimestamp.conversationId]: cwd,
          },
        };
      });
    },

    updateConversationPreview: (conversationId, preview) => {
      const cwd = get().conversationIndex[conversationId];
      if (!cwd) return;
      set((state) => {
        const list = state.conversationsByCwd[cwd] ?? [];
        const nextList = list.map((item) =>
          item.conversationId === conversationId
            ? { ...item, preview }
            : item,
        );
        return {
          conversationsByCwd: {
            ...state.conversationsByCwd,
            [cwd]: nextList,
          },
        };
      });
    },

    removeConversation: async (conversationId) => {
      const cwd = get().conversationIndex[conversationId];
      if (!cwd) return;
      const activeStore = useActiveConversationStore.getState();
      const shouldClearActive =
        activeStore.activeConversationId === conversationId;
      set((state) => {
        const list = state.conversationsByCwd[cwd] ?? [];
        const nextList = list.filter(
          (item) => item.conversationId !== conversationId,
        );
        const nextIndex = { ...state.conversationIndex };
        delete nextIndex[conversationId];
        const favorites = state.favoriteConversationIdsByCwd[cwd] ?? [];
        const nextFavorites = favorites.filter((id) => id !== conversationId);
        const favoriteConversationIdsByCwd = {
          ...state.favoriteConversationIdsByCwd,
          [cwd]: nextFavorites,
        };
        if (nextFavorites.length === 0) {
          delete favoriteConversationIdsByCwd[cwd];
        }

        return {
          conversationsByCwd: {
            ...state.conversationsByCwd,
            [cwd]: nextList,
          },
          conversationIndex: nextIndex,
          favoriteConversationIdsByCwd,
        };
      });
      activeStore.removeConversationId(conversationId);
      if (shouldClearActive) {
        activeStore.clearActiveConversation();
      }
      await removeConversationFromBackend(cwd, conversationId);
    },

    setFavorite: async (conversationId, isFavorite) => {
      const cwd = get().conversationIndex[conversationId];
      if (!cwd) return;
      set((state) => {
        const favorites = state.favoriteConversationIdsByCwd[cwd] ?? [];
        const hasFavorite = favorites.includes(conversationId);

        if (isFavorite && hasFavorite) {
          return {};
        }

        if (!isFavorite && !hasFavorite) {
          return {};
        }

        const nextFavorites = isFavorite
          ? [...favorites, conversationId]
          : favorites.filter((id) => id !== conversationId);

        const favoriteConversationIdsByCwd = {
          ...state.favoriteConversationIdsByCwd,
          [cwd]: nextFavorites,
        };

        if (nextFavorites.length === 0) {
          delete favoriteConversationIdsByCwd[cwd];
        }

        return { favoriteConversationIdsByCwd };
      });
      await syncFavoritesToBackend(cwd);
    },

    toggleFavorite: async (conversationId) => {
      const cwd = get().conversationIndex[conversationId];
      if (!cwd) return;
      const favorites = get().favoriteConversationIdsByCwd[cwd] ?? [];
      const isFavorite = favorites.includes(conversationId);
      await get().setFavorite(conversationId, !isFavorite);
    },

    reset: () =>
      set({
        conversationsByCwd: {},
        conversationIndex: {},
        favoriteConversationIdsByCwd: {},
        loadedAllByCwd: {},
        hasMoreByCwd: {},
      }),
  }),
);

// Helper to load project sessions from backend and update the store
export async function loadProjectSessions(cwd: string, loadAll: boolean = false) {
  let result: { sessions?: any[]; favorites?: string[] } | null = null;
  try {
    result = (await invoke("load_project_sessions", { projectPath: cwd })) as {
      sessions?: any[];
      favorites?: string[];
    };
  } catch (_) {
    result = { sessions: [], favorites: [] };
  }

  const sessions = result?.sessions ?? [];
  const favorites = result?.favorites ?? [];
  const visibleSessions = loadAll ? sessions : sessions.slice(0, 10);

  useConversationListStore.getState().reset();

  useConversationListStore.setState((state) => ({
    favoriteConversationIdsByCwd: {
      ...state.favoriteConversationIdsByCwd,
      [cwd]: favorites,
    },
    loadedAllByCwd: {
      ...state.loadedAllByCwd,
      [cwd]: loadAll,
    },
    hasMoreByCwd: {
      ...state.hasMoreByCwd,
      [cwd]: sessions.length > visibleSessions.length,
    },
  }));

  for (const summary of visibleSessions) {
    await useConversationListStore.getState().addConversation(cwd, summary);
  }
}
