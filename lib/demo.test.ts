import { describe, it, expect, afterEach, vi } from "vitest";
import { isDemoSession } from "./demo";

const cookie = (v?: string) => ({ get: () => (v === undefined ? undefined : { value: v }) });

afterEach(() => vi.unstubAllEnvs());

describe("isDemoSession", () => {
  it("ignores the demo cookie unless DEMO_MODE=1", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "k");
    expect(isDemoSession(cookie("1"))).toBe(false);
  });

  it("does not fall back to demo when Supabase config is missing and DEMO_MODE is off", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(isDemoSession(cookie())).toBe(false);
  });

  it("honours the cookie when DEMO_MODE=1", () => {
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "k");
    expect(isDemoSession(cookie("1"))).toBe(true);
    expect(isDemoSession(cookie())).toBe(false);
  });

  it("is demo without a cookie only when DEMO_MODE=1 and Supabase is unconfigured", () => {
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(isDemoSession(cookie())).toBe(true);
  });
});
