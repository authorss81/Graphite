import { describe, it, expect } from "vitest";
import { isSupabaseAvailable } from "./supabase";

describe("supabase connection", () => {
  it("is available when env vars are set", () => {
    expect(isSupabaseAvailable()).toBe(true);
  });
});
