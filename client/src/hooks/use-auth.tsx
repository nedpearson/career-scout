import { create } from "zustand";
import type { AuthUser } from "@shared/models/auth";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (isLoading: boolean) => void;
}

// Auth is fully bypassed: always provide a stable local user.
const BYPASS_USER: AuthUser = {
  id: "bypass_user",
  email: "bypass@career-scout.local",
  name: "Bypass User",
};

export const useAuth = create<AuthState>()((set) => ({
  user: BYPASS_USER,
  isLoading: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
