import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session } from "@supabase/supabase-js";
import { getCurrentSession, signIn, signUp, signOut } from "../utils/auth";
import { supabase } from "../utils/supabase";

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
          if (!supabase) {
            set({ session: null, isAuthenticated: true, isInitializing: false });
            return;
          }
          const session = await getCurrentSession();
          set({
            session,
            isAuthenticated: true,
            isInitializing: false,
          });

          supabase.auth.onAuthStateChange((_event, newSession) => {
            set({
              session: newSession,
              isAuthenticated: true,
            });
          });
        } catch {
          set({ session: null, isAuthenticated: true, isInitializing: false });
        }
      },

      login: async (email, password) => {
        set({ authLoading: true, authError: null });
        try {
          const session = await signIn(email, password);
          set({ session, isAuthenticated: true, authLoading: false });
        } catch (err: unknown) {
          set({ authError: err instanceof Error ? err.message : "Login failed", authLoading: false });
          throw err;
        }
      },

      register: async (email, password) => {
        set({ authLoading: true, authError: null });
        try {
          const session = await signUp(email, password);
          set({ session, isAuthenticated: session !== null, authLoading: false });
        } catch (err: unknown) {
          set({ authError: err instanceof Error ? err.message : "Registration failed", authLoading: false });
          throw err;
        }
      },

      logout: async () => {
        set({ authLoading: true });
        try {
          await signOut();
          set({ session: null, isAuthenticated: false, authLoading: false });
        } catch (err: unknown) {
          set({ authError: err instanceof Error ? err.message : "Logout failed", authLoading: false });
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
