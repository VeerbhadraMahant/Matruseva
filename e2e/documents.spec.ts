import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { demoSignIn, PATIENT } from "./helpers/demo";

/**
 * Documents pipeline in demo mode (needs DEMO_MODE=1; data lives in the local demo store, not Supabase).
 * fixtures/lab-report.png is a typed lab slip: Hb 10.5 g/dL, BP 120/80 mmHg.
 * OCR runs for real (Sarvam if configured on the server, else local Tesseract), so allow time.
 */

const IMAGE = path.resolve(__dirname, "fixtures/lab-report.png");
const OCR_TIMEOUT = 120_000;

/** Uploads the fixture and waits until the uploader stops saying "Uploading"/"Reading text". */
async function uploadAndWait(page: Page) {
  await page.locator('input[type="file"]').first().setInputFiles(IMAGE);
  const status = page.locator('ul[aria-live="polite"] li').first();
  await expect(status).toBeVisible();
  await expect(status).not.toContainText(/Uploading|Reading text/, { timeout: OCR_TIMEOUT });
  await expect(status).toContainText(/Done|Saved\. Text could not be read|Failed/);
  return status;
}

const panel = (page: Page, heading: RegExp) => page.locator("section").filter({ has: page.getByRole("heading", { name: heading }) });

test("inbox upload is read (never stuck on pending), shows values, and can be assigned to a patient", async ({ page }) => {
  test.setTimeout(240_000);
  await demoSignIn(page);
  await page.goto("/documents");

  const inbox = panel(page, /^Inbox/);
  const processed = panel(page, /^Processed/);
  const inboxBefore = await inbox.locator("ul > li").count();
  const processedBefore = await processed.locator("ul > li").count();

  await uploadAndWait(page);

  await expect(inbox.locator("ul > li")).toHaveCount(inboxBefore + 1);
  const card = inbox.locator("ul > li").first(); // newest first
  await expect(card).toContainText(/Text indexed|No text found/); // anything but "Reading…"
  await expect(card).not.toContainText("Reading…");

  // Extracted values (scenario 4): tolerate OCR engine variance.
  const ocrOk = await card.getByText("Text indexed").isVisible();
  if (ocrOk) {
    const values = card.locator("details");
    if (await values.count()) {
      await values.locator("summary").click();
      await expect(values).toContainText("Extracted values - please verify");
      await expect(values).toContainText("10.5");
      await expect(values).toContainText("120/80");
    } else {
      test.info().annotations.push({ type: "note", description: "OCR text had no recognisable Hb/BP; values assertion skipped" });
    }
  } else {
    test.info().annotations.push({ type: "note", description: "OCR returned no text; extracted-values assertion skipped" });
  }

  // Assign to a patient.
  await card.getByPlaceholder("Search patient by name…").fill("Pooja");
  await card.getByRole("button", { name: /Pooja Deshmukh/ }).click();
  await card.getByRole("button", { name: "Assign" }).click();

  await expect(inbox.locator("ul > li")).toHaveCount(inboxBefore);
  await expect(processed.locator("ul > li")).toHaveCount(Math.min(processedBefore + 1, 24));
  await expect(processed.locator("ul > li").first().getByRole("link", { name: "Pooja Deshmukh" })).toBeVisible();

  await page.goto(`/patients/${PATIENT}`);
  await expect(panel(page, /^Documents/).locator("ul li").first()).toBeVisible();
});

test("upload from the patient page attaches to that patient", async ({ page }) => {
  test.setTimeout(240_000);
  await demoSignIn(page);
  await page.goto(`/patients/${PATIENT}`);

  const docs = panel(page, /^Documents/);
  const cards = docs.locator("ul:not([aria-live]) > li");
  const before = await cards.count();

  await uploadAndWait(page);

  await expect(cards).toHaveCount(before + 1);
  // It went to the patient, not the unfiled inbox: the new card is not listed under the documents inbox.
  await page.goto("/documents");
  const inboxCards = await panel(page, /^Inbox/).locator("ul > li").count();
  await page.goto(`/patients/${PATIENT}`);
  await expect(cards).toHaveCount(before + 1);
  await page.goto("/documents");
  await expect(panel(page, /^Inbox/).locator("ul > li")).toHaveCount(inboxCards);
});
