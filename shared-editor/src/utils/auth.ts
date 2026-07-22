import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

export interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email: string, password: string): Promise<Session | null> {
  const { data, error } = await supabase!.auth.signUp({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase!.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase!.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase!.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}

export function isAuthConfigured(): boolean {
  return supabase !== null;
}
