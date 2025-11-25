import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Light/dark mode
export type Theme = 'light' | 'dark';

// Accent color theme
export type Accent =  'black' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';

interface ThemeState {
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAccent: (accent: Accent) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Defaults: dark mode with pink accent
      theme: 'dark',
      accent: 'pink',
      setTheme: (theme: Theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setAccent: (accent: Accent) => set({ accent }),
    }),
    {
      name: 'theme-storage',
    }
  )
);
