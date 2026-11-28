import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoSession } from "./demo";

// Inspect the actual app configuration: testing demo.ts alone misses build-time
// replacements made by next.config.env, which previously forced demo mode on.
vi.mock("@serwist/next", () => ({ default: () => (config: unknown) => config }));
import config from "../next.config";

afterEach(() => vi.unstubAllEnvs());

describe("demo deployment configuration", () => {
  it("does not inline a default demo bypass into the Next.js bundle", () => {
    expect(config.env ?? {}).not.toHaveProperty("DEMO_MODE");
    vi.stubEnv("DEMO_MODE", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(isDemoSession({ get: () => ({ value: "1" }) })).toBe(false);
  });

  it("still supports an explicit runtime demo opt-in", () => {
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "placeholder");
    expect(isDemoSession({ get: () => ({ value: "1" }) })).toBe(true);
    expect(isDemoSession({ get: () => undefined })).toBe(false);
  });
});
