import { supabase } from "./supabase";
import { toast } from "../components/Toast";
import type { Session } from "@supabase/supabase-js";

export interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
}

function getClient() {
  if (!supabase) {
    const msg = "Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env";
    toast(msg, "error");
    throw new Error(msg);
  }
  return supabase;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const client = getClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email: string, password: string): Promise<Session | null> {
  const client = getClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut(): Promise<void> {
  const client = getClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession(): Promise<Session | null> {
  const client = getClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function resetPasswordForEmail(email: string): Promise<void> {
  const client = getClient();
  const { error } = await client.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
): () => void {
  const client = getClient();
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}

export function isAuthConfigured(): boolean {
  return supabase !== null;
}
