import { expect, test } from "@playwright/test";

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
