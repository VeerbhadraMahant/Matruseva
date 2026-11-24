import path from "node:path";
import { devices, expect, test } from "@playwright/test";

/**
 * Consultation scribe, end to end on an emulated phone: record (Chrome's fake
 * mic plays fixtures/consultation.wav), upload, Sarvam transcription, Gemini summary.
 *
 * Uses the REAL Sarvam and Gemini APIs (about Rs 0.4 of Sarvam credit per run),
 * so it only runs when RUN_SCRIBE_E2E=1. Needs a server with DEMO_MODE=1 and both keys:
 *   RUN_SCRIBE_E2E=1 npx playwright test e2e/consultation-scribe.spec.ts
 * The fixture is a 36 s Hindi/English antenatal visit for demo patient Sunita Verma,
 * mentioning her phone number (9845012345), BP 140/92, Hb 9.8 and FHR 146.
 */

const audio = path.resolve(__dirname, "fixtures/consultation.wav");

test.use({
  ...devices["Pixel 7"],
  permissions: ["microphone"],
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${audio}`],
  },
});

test.skip(process.env.RUN_SCRIBE_E2E !== "1", "spends real Sarvam credit; set RUN_SCRIBE_E2E=1");

test("records a consultation on a phone and shows transcript plus de-identified summary", async ({ page }) => {
  test.setTimeout(240_000);

  await page.goto("/login");
  await page.getByRole("button", { name: "Demo sign in" }).click();
  await page.waitForURL("**/today");

  await page.goto("/patients/p2-sunita-verma");
  await page.getByRole("link", { name: "Record consultation" }).click();
  await page.waitForURL("**/patients/p2-sunita-verma/consult");

  const start = page.getByRole("button", { name: "Start recording" });
  await expect(start).toBeDisabled(); // consent first
  await page.getByLabel("The patient has agreed to this consultation being recorded.").check();
  await start.click();

  await expect(page.getByText("Recording", { exact: false }).first()).toBeVisible();
  await page.waitForTimeout(38_000); // one full pass of the fixture
  await page.getByRole("button", { name: "Stop and transcribe" }).click();

  const transcript = page.getByRole("heading", { name: "Transcript" });
  await expect(transcript).toBeVisible({ timeout: 180_000 });
  const transcriptPanel = page.locator("section", { has: transcript });
  await expect(transcriptPanel).toContainText("140");
  await expect(transcriptPanel).toContainText("9845012345"); // raw transcript keeps details, doctor-only

  const summaryPanel = page.locator("section", { has: page.getByRole("heading", { name: "AI summary (draft)" }) });
  await expect(summaryPanel.getByRole("heading", { name: "Vitals and findings" })).toBeVisible();
  await expect(summaryPanel).toContainText("140/92");
  // The model only ever saw placeholders, so no identifier can appear in its output.
  await expect(summaryPanel).not.toContainText("9845012345");
  await expect(summaryPanel).not.toContainText(/sunita|सुनीता/i);

  await page.screenshot({ path: test.info().outputPath("consult-result.png"), fullPage: true });
});
