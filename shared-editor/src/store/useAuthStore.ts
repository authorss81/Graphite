import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session } from "@supabase/supabase-js";
import { getCurrentSession, signIn, signUp, signOut } from "../utils/auth";

interface AuthStore {
  session: Session | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  authError: string | null;
  authLoading: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      session: null,
      isAuthenticated: false,
      isInitializing: true,
      authError: null,
      authLoading: false,

      initialize: async () => {
        try {
          const session = await getCurrentSession();
          set({
            session,
            isAuthenticated: session !== null,
            isInitializing: false,
          });
        } catch {
          set({ session: null, isAuthenticated: false, isInitializing: false });
        }
      },

      login: async (email, password) => {
        set({ authLoading: true, authError: null });
        try {
          const session = await signIn(email, password);
          set({ session, isAuthenticated: true, authLoading: false });
        } catch (err: any) {
          set({ authError: err.message, authLoading: false });
          throw err;
        }
      },

      register: async (email, password) => {
        set({ authLoading: true, authError: null });
        try {
          const session = await signUp(email, password);
          set({ session, isAuthenticated: session !== null, authLoading: false });
        } catch (err: any) {
          set({ authError: err.message, authLoading: false });
          throw err;
        }
      },

      logout: async () => {
        set({ authLoading: true });
        try {
          await signOut();
          set({ session: null, isAuthenticated: false, authLoading: false });
        } catch (err: any) {
          set({ authError: err.message, authLoading: false });
        }
      },

      clearError: () => set({ authError: null }),
    }),
    {
      name: "graphite-auth",
      partialize: (state) => ({ session: state.session, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
