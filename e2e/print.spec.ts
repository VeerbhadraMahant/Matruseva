import { expect, test } from "@playwright/test";
import { demoSignIn, PATIENT } from "./helpers/demo";

/** Print layout: only <main> prints, no app chrome, report buttons hidden, report fits 2 pages. Needs DEMO_MODE=1. */

for (const route of [`/patients/${PATIENT}/report`, `/patients/${PATIENT}`]) {
  test.describe(`print media: ${route.endsWith("report") ? "report" : "patient page"}`, () => {
    test("desktop: no sidebar or top bar in print", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await demoSignIn(page);
      await page.goto(route);
      const sidebar = page.locator("aside.app-sidebar");
      const header = page.locator("header").first();
      await expect(sidebar).toBeVisible();
      await expect(header).toBeVisible();

      await page.emulateMedia({ media: "print" });
      await expect(sidebar).toBeHidden();
      await expect(header).toBeHidden();
      await expect(page.locator("main")).toBeVisible();
    });

    test("mobile: no bottom tab bar in print", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await demoSignIn(page);
      await page.goto(route);
      const tabs = page.getByRole("navigation").filter({ has: page.getByRole("link", { name: "Docs" }) });
      await expect(tabs).toBeVisible();
      for (const name of ["Today", "Patients", "Calls", "Docs", "OPD"]) await expect(tabs.getByRole("link", { name })).toBeVisible();

      await page.emulateMedia({ media: "print" });
      await expect(tabs).toBeHidden();
      await expect(page.locator("header").first()).toBeHidden();
      await expect(page.locator("main")).toBeVisible();
    });
  });
}

test("report: content visible, buttons hidden, PDF is at most 2 pages", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoSignIn(page);
  await page.goto(`/patients/${PATIENT}/report`);
  const report = page.locator(".rpt-doc");
  await expect(page.locator("main button:visible").first()).toBeVisible(); // toolbar buttons exist on screen

  await page.emulateMedia({ media: "print" });
  await expect(report).toBeVisible();
  await expect(report).toContainText("Pooja Deshmukh");
  expect(await page.locator("main button:visible").count(), "buttons must not print").toBe(0);

  const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true, printBackground: true });
  // shortcut: counts page objects by regex (no PDF dependency); fine for Chromium output, which writes one /Type /Page per page.
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pages).toBeGreaterThanOrEqual(1);
  expect(pages).toBeLessThanOrEqual(2);
});
