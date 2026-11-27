import { expect, test } from "@playwright/test";
import { demoSignIn, PATIENT } from "./helpers/demo";

for (const width of [390, 1440]) {
  test(`visit calendars save the selected dates at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await demoSignIn(page);
    await page.goto(`/patients/${PATIENT}`);
    const visit = page.getByLabel("Visit date", { exact: true });
    const next = page.getByLabel("Next visit", { exact: true });
    await expect(visit).toHaveAttribute("type", "date");
    await expect(next).toHaveAttribute("type", "date");
    await expect(visit).toHaveValue(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));

    const nextDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    await next.fill(nextDate);
    await visit.fill("2024-02-29");
    const note = `Calendar leap day ${width} ${Date.now()}`;
    await page.locator("#notes").fill(note);
    await page.getByRole("button", { name: "Save visit", exact: true }).click();
    await expect(page.getByRole("row", { name: new RegExp(note) })).toContainText("29 Feb");
    await page.reload();
    await expect(page.getByRole("row", { name: new RegExp(note) })).toContainText("29 Feb");
  });
}

test("split-screen visit entry provides both native date pickers", async ({ page }) => {
  await demoSignIn(page);
  await page.goto(`/patients/${PATIENT}`);
  await page.getByText("More", { exact: true }).click();
  await page.getByRole("button", { name: /Open split/i }).click();
  const dialog = page.getByRole("dialog", { name: /Split-screen document review/i });
  const visit = dialog.getByLabel("Visit date", { exact: true });
  const next = dialog.getByLabel("Next visit", { exact: true });
  await expect(visit).toHaveAttribute("type", "date");
  await expect(next).toHaveAttribute("type", "date");
  await visit.fill("2024-02-29");
  await next.fill("2024-03-07");
  const note = `Split calendar regression ${Date.now()}`;
  await dialog.locator("textarea").fill(note);
  await dialog.getByRole("button", { name: /Save visit/i }).click();
  await expect(page.getByText("Visit saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(note) })).toContainText("29 Feb");
});
