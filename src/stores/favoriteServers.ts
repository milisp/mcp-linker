import type { ServerType } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoriteServersState {
  /** Snapshots of favorited registry servers, kept locally. */
  favoriteServers: ServerType[];
  toggleFavorite: (server: ServerType) => void;
  isFavorited: (id: string) => boolean;
}

export const useFavoriteServers = create<FavoriteServersState>()(
  persist(
    (set, get) => ({
      favoriteServers: [],

      toggleFavorite: (server) => {
        const current = get().favoriteServers;
        set({
          favoriteServers: current.some((s) => s.id === server.id)
            ? current.filter((s) => s.id !== server.id)
            : [...current, { ...server, isFavorited: true }],
        });
      },

      isFavorited: (id) => get().favoriteServers.some((s) => s.id === id),
    }),
    { name: "mcp-linker-favorites" },
  ),
);
