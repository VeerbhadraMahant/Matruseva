import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  const text = readFileSync(join(process.cwd(), ".env"), "utf8").replace(/\r\n/g, "\n");
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) process.env[match[1]] ??= match[2].trim();
  }
}
loadEnv();

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RUN_ID = Date.now();
const DOCTOR_EMAIL = `e2e.golden.${RUN_ID}@example.com`;
const PASSWORD = "TestPassword123!";
const CLINIC_NAME = `E2E Golden Path Clinic ${RUN_ID}`;
const PATIENT_NAME = `E2E Test Patient ${RUN_ID}`;

let clinicId: string | undefined;
let patientId: string | undefined;

test.afterAll(async () => {
  if (clinicId) await admin.from("clinics").delete().eq("id", clinicId);
  const { data } = await admin.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === DOCTOR_EMAIL);
  if (user) await admin.auth.admin.deleteUser(user.id);
});

test("signup -> onboarding -> patient with late-booking schedule -> document capture/OCR/search -> assign completes item -> at-risk surfaces on /today and /calls", async ({
  page,
}) => {
  // --- Signup ---
  await page.goto("/signup");
  await page.fill("input[name=email]", DOCTOR_EMAIL);
  await page.fill("input[name=password]", PASSWORD);
  await page.click("form button[type=submit]");
  await page.waitForURL("**/onboarding");

  // --- Onboarding ---
  await page.fill("input[name=clinicName]", CLINIC_NAME);
  await page.fill("input[name=doctorFullName]", "Dr. E2E");
  await page.click("button[type=submit]");
  await page.waitForURL("**/today");

  const clinic = await admin.from("clinics").select("id").eq("name", CLINIC_NAME).single();
  clinicId = clinic.data?.id;
  expect(clinicId).toBeTruthy();

  // --- Register a patient whose LMP is 14 weeks in the past: the booking,
  // dating scan and NT scan windows already closed before "today" (the
  // registration date), so they should come back "Missed" (late booking),
  // not "Overdue" — overdue only applies to items whose window was still
  // open when the schedule was generated. See lib/schedule.test.ts. ---
  await page.goto("/patients/new");
  const lmp = new Date();
  lmp.setDate(lmp.getDate() - 14 * 7);
  await page.fill("input[name=name]", PATIENT_NAME);
  await page.fill("input[name=lmp]", lmp.toISOString().slice(0, 10));
  await page.click("button:has-text('Register patient')");
  await page.waitForURL(/\/patients\/[0-9a-f-]+$/);
  patientId = page.url().split("/patients/")[1];

  await expect(page.getByText("Booking visit + labs")).toBeVisible();
  const bookingRow = page.locator("li", { hasText: "Booking visit + labs" });
  await expect(bookingRow.getByText("Missed")).toBeVisible();
  const ntScanRow = page.locator("li", { hasText: "NT scan + double marker" });
  await expect(ntScanRow.getByText("Missed")).toBeVisible();
  const anomalyScanRow = page.locator("li", { hasText: "Anomaly scan" });
  await expect(anomalyScanRow.getByText("Upcoming")).toBeVisible();

  // --- Also record a visit with a stale next-visit date, so this patient
  // becomes "at risk" for the /today and /calls checks later. ---
  await page.fill("input[name=nextVisitDate]", isoDaysAgo(10));
  await page.click("button:has-text('Save visit')");
  await expect(page.getByText("No visits recorded yet.")).not.toBeVisible();

  // --- Document capture: inject a synthetic canvas image with known text
  // (no fixture asset needed), verify OCR recognizes it and it's searchable. ---
  await page.goto("/documents");
  const ocrText = `MATRUSETU E2E ${RUN_ID}`;
  await injectTestImage(page, "input[type=file]", ocrText);
  await expect(page.getByText("Done")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Text found")).toBeVisible({ timeout: 10_000 });

  await page.goto(`/documents?q=${encodeURIComponent(String(RUN_ID))}`);
  await expect(page.getByText("Text found")).toBeVisible();

  // --- Assign it to the patient and link it to the NT scan care event,
  // which should mark that event done. ---
  await page.fill('input[placeholder="Search patient by name…"]', PATIENT_NAME);
  await page.click(`button:has-text("${PATIENT_NAME}")`);
  await page.selectOption("select[name=careEventId]", { label: "Complete: NT scan + double marker" });
  await page.click("button:has-text('Assign')");
  await expect(page.getByText("Assign", { exact: true })).toHaveCount(0); // form is gone once assigned

  await page.goto(`/patients/${patientId}`);
  const ntScanRowAfter = page.locator("li", { hasText: "NT scan + double marker" });
  await expect(ntScanRowAfter.getByText("Done")).toBeVisible();

  // --- Follow-up: this patient (stale next-visit date) should be "at risk"
  // on /today and appear in the /calls queue. ---
  await page.goto("/today");
  await expect(page.getByText("At risk")).toBeVisible();

  await page.goto("/calls");
  const callRow = page.locator("li", { hasText: PATIENT_NAME });
  await expect(callRow).toBeVisible();
  await callRow.locator("select[name=outcome]").selectOption("no_answer");
  await callRow.locator("button:has-text('Log')").click();
  await expect(page.getByText("An error", { exact: false })).not.toBeVisible();
});

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function injectTestImage(page: Page, inputSelector: string, text: string) {
  await page.locator(inputSelector).evaluate(async (input: HTMLInputElement, text: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 800, 200);
    ctx.fillStyle = "black";
    ctx.font = "36px Arial";
    ctx.fillText(text, 40, 100);
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    const file = new File([blob], "e2e-test.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, text);
}
