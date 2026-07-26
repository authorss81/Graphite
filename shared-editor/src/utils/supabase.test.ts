import { describe, it, expect } from "vitest";
import { isSupabaseAvailable } from "./supabase";

describe("supabase connection", () => {
  it("is available when env vars are set", () => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return; // skip if env vars not configured
    }
    expect(isSupabaseAvailable()).toBe(true);
  });
});
