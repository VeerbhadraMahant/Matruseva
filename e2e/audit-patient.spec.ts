import { expect, test } from "@playwright/test";
import QRCode from "qrcode";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Demo sign in" }).click();
  await page.waitForURL("**/today");
});

test("Record visit is the primary patient action and More reveals secondary actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/patients/p2-sunita-verma");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Record visit", exact: true })).toHaveCount(1);
  await expect(main.getByText("Gestational age", { exact: true }).first()).toBeInViewport();
  await expect(main.getByRole("link", { name: "1-Page Report" })).toBeHidden();
  await main.getByText("More", { exact: true }).click();
  await expect(main.getByRole("link", { name: "1-Page Report" })).toBeVisible();
});

test("visit entry rejects blank and extreme readings and saves a valid visit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/patients/p3-kavita-patel");
  const main = page.getByRole("main");
  await main.getByRole("link", { name: "Record visit", exact: true }).click();
  const heading = main.getByRole("heading", { name: "Record visit", exact: true });
  await expect(heading).toBeInViewport();
  expect((await heading.boundingBox())?.y).toBeGreaterThanOrEqual(64);
  const visitDate = main.getByLabel("Visit date", { exact: true });
  await expect(visitDate).toHaveValue(/^\d{2}\/\d{2}\/\d{4}$/);
  const systolic = main.locator("#bpSys");
  await expect(systolic).toHaveValue("");
  await expect(systolic).not.toHaveAttribute("placeholder");
  await main.getByRole("button", { name: "Save visit", exact: true }).click();
  await expect(main.getByRole("alert")).toContainText(/enter at least one/i);
  await systolic.fill("1400");
  await main.getByRole("button", { name: "Save visit", exact: true }).click();
  await expect(main.getByRole("alert")).toContainText(/BP sys/i);
  await systolic.fill("118");
  await main.locator("#bpDia").fill("76");
  const note = `Audit visit ${Date.now()}`;
  await main.locator("#notes").fill(note);
  await main.getByRole("button", { name: "Save visit", exact: true }).click();
  await expect(main.getByRole("row", { name: new RegExp(note) })).toContainText("118/76");
});

test("card lookup and QR scan open the patient record and unknown cards show an error", async ({ page }) => {
  await page.goto("/scan");
  await page.getByRole("button", { name: "Scan card", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const card = dialog.getByRole("textbox");
  await expect(card).toHaveAccessibleName(/card number/i);
  await card.fill("missing-card");
  await dialog.getByRole("button", { name: "Go" }).click();
  await expect(dialog.getByText(/no patient.*card/i)).toBeVisible();
  await card.fill("anc-102");
  await dialog.getByRole("button", { name: "Go" }).click();
  await expect(page).toHaveURL(/\/patients\/p2-sunita-verma$/);
  await expect(page.getByRole("heading", { name: "Sunita Verma" })).toBeVisible();

  await page.goto("/scan");
  await page.getByRole("button", { name: "Scan card", exact: true }).click();
  const buffer = await QRCode.toBuffer("https://example.test/patients/p2-sunita-verma/report", { width: 512 });
  await dialog.locator('input[type="file"]').setInputFiles({ name: "card.png", mimeType: "image/png", buffer });
  await expect(page).toHaveURL(/\/patients\/p2-sunita-verma$/);
  await expect(page.getByRole("heading", { name: "Sunita Verma" })).toBeVisible();
});

test("care event completion is confirmed, dated and undoable", async ({ page }) => {
  await page.goto("/patients/p2-sunita-verma");
  const main = page.getByRole("main");
  const upcoming = main.getByRole("row", { name: /Growth scan/i });
  await expect(upcoming).toContainText(/upcoming/i);
  await expect(upcoming.getByRole("button", { name: "Mark done" })).toHaveCount(0);
  const ogtt = main.getByRole("row", { name: /OGTT/i });
  const button = ogtt.getByRole("button", { name: "Mark done" });
  expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await button.click();
  const dialog = page.getByRole("dialog", { name: "Confirm completion" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(ogtt).toContainText(/due now/i);
  await button.click();
  const date = new Date(Date.now() - 86400000);
  await dialog.getByLabel("Completion date").fill(date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(ogtt).toContainText(date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" }));
  await expect(ogtt).toContainText(/done/i);
  await ogtt.getByRole("button", { name: "Undo" }).click();
  await expect(ogtt).toContainText(/due now/i);
  await expect(button).toBeVisible();
});
