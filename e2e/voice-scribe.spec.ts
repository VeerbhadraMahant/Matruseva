import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { demoSignIn, PATIENT } from "./helpers/demo";

/**
 * Visit-form voice scribe with Chrome's fake microphone playing fixtures/vitals-en.wav
 * ("BP one twenty by eighty, weight fifty eight kilo, haemoglobin ten point five").
 * Default run mocks /api/voice-vitals (free). RUN_VOICE_E2E=1 calls the real Sarvam API (paid) instead.
 * Needs DEMO_MODE=1.
 */

const audio = path.resolve(__dirname, "fixtures/vitals-en.wav");
const REAL = process.env.RUN_VOICE_E2E === "1";

test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${audio}`],
  },
});

async function openScribe(page: Page) {
  await demoSignIn(page);
  await page.goto(`/patients/${PATIENT}`);
  await page.getByRole("button", { name: "Dictate vitals" }).click();
  const dialog = page.getByRole("dialog", { name: "ASHA voice-to-vitals AI scribe" });
  await expect(dialog).toBeVisible();
  await dialog.locator("select").selectOption("en-IN");
  return dialog;
}

async function recordClip(page: Page, dialog: ReturnType<Page["getByRole"]>) {
  await dialog.getByRole("button", { name: "Start dictating" }).click();
  await expect(dialog.getByText(/Recording/)).toBeVisible();
  await page.waitForTimeout(REAL ? 9_000 : 3_000); // the fixture is ~7 s
  await dialog.getByRole("button", { name: "Stop recording" }).click();
}

test("mocked transcript: parser fills rows and Apply fills the visit form", async ({ page }) => {
  test.skip(REAL, "real-API mode runs the other test");
  await page.route("**/api/voice-vitals", (route) =>
    route.fulfill({ json: { transcript: "BP one twenty by eighty, weight fifty eight kilo, haemoglobin ten point five" } }),
  );
  const dialog = await openScribe(page);
  await recordClip(page, dialog);

  await expect(dialog.getByLabel("BP sys (mmHg)")).toHaveValue("120");
  await expect(dialog.getByLabel("BP dia (mmHg)")).toHaveValue("80");
  await expect(dialog.getByLabel("Weight", { exact: true })).toHaveValue("58");
  await expect(dialog.getByLabel("Haemoglobin", { exact: true })).toHaveValue("10.5");

  await dialog.getByRole("button", { name: "Verify all" }).click();
  await dialog.getByRole("button", { name: /^Apply \d+ verified$/ }).click();
  await expect(dialog).toBeHidden();

  await expect(page.locator("#bpSys")).toHaveValue("120");
  await expect(page.locator("#bpDia")).toHaveValue("80");
  await expect(page.locator("#weight")).toHaveValue("58");
  await expect(page.locator("#hb")).toHaveValue("10.5");

  // Applying dictation must leave the native calendar available and preserve
  // its selection when the visit is saved and the patient record reloads.
  const nextVisit = page.getByLabel("Next visit", { exact: true });
  await expect(nextVisit).toHaveAttribute("type", "date");
  const nextDate = new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  await nextVisit.fill(nextDate);
  const note = `Voice calendar regression ${Date.now()}`;
  await page.locator("#notes").fill(note);
  await page.getByRole("button", { name: "Save visit", exact: true }).click();
  await expect(page.getByRole("row", { name: new RegExp(note) })).toContainText("120/80");
  await page.reload();
  await expect(page.getByText("Next visit", { exact: true }).and(page.locator("p")).locator("..")).toContainText(
    new Date(`${nextDate}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
  );
});

test("recording never sticks on transcribing; ends in values or a clear error", async ({ page }) => {
  if (!REAL) await page.route("**/api/voice-vitals", (route) => route.fulfill({ status: 502, json: { code: "failed" } }));
  const dialog = await openScribe(page);
  await recordClip(page, dialog);

  await expect(dialog.getByText("Transcribing your dictation…")).toBeHidden({ timeout: 60_000 });
  await expect(dialog.getByRole("button", { name: "Record again" })).toBeEnabled();
  // Either extracted values or an alert; never a silent blank.
  await expect(dialog.getByRole("alert").or(dialog.getByText(/Extracted values/))).toBeVisible();
});

test("real Sarvam: 120/80, 58 kg, Hb 10.5", async ({ page }) => {
  test.skip(!REAL, "spends real Sarvam credit; set RUN_VOICE_E2E=1");
  test.setTimeout(120_000);
  const dialog = await openScribe(page);
  await recordClip(page, dialog);

  await expect(dialog.getByText("Transcribing your dictation…")).toBeHidden({ timeout: 60_000 });
  await expect(dialog.getByLabel("BP sys (mmHg)")).toHaveValue("120");
  await expect(dialog.getByLabel("BP dia (mmHg)")).toHaveValue("80");
  await expect(dialog.getByLabel("Weight", { exact: true })).toHaveValue("58");
  await expect(dialog.getByLabel("Haemoglobin", { exact: true })).toHaveValue("10.5");
});
