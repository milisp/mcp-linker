import authService from "@/services/auth";
import { create } from "zustand";

// User info with tier from backend
export type UserWithTier = {
  id: string;
  email?: string;
  fullname?: string;
  tier?: string;
  trialActive: boolean;
  trialEndsAt: Date | null;
};

interface UserStore {
  user: UserWithTier | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
}

// Zustand store for user info
export const useUserStore = create<UserStore>((set) => ({
  user: null,
  loading: false,
  // Fetch user info from backend
  fetchUser: async () => {
    set({ loading: true });
    try {
      const user = await authService.getCurrentUser();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
