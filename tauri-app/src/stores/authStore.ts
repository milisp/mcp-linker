import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OAuthProvider = 'github' | 'google';

interface AuthState {
  lastOAuthProvider: OAuthProvider | null;
  setLastOAuthProvider: (provider: OAuthProvider) => void;
  clearLastOAuthProvider: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      lastOAuthProvider: null,
      setLastOAuthProvider: (provider: OAuthProvider) => set({ lastOAuthProvider: provider }),
      clearLastOAuthProvider: () => set({ lastOAuthProvider: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        lastOAuthProvider: state.lastOAuthProvider,
      }),
    }
  )
);

