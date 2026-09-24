import { defineConfig, devices } from "@playwright/test";

/**
 * Local/manual only — this test suite drives a real Supabase project (no
 * local Supabase stack is available; see README). It is not wired into
 * ci.yml because CI has no Supabase credentials and running it there would
 * write test data into whatever project's secrets were configured. Run
 * locally with a dev server up: `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
