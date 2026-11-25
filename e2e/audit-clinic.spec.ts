import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Demo sign in" }).click();
  await page.waitForURL("**/today");
});

test("mobile queue requires an explicit action to call and offers a direct outcome form", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/calls");
  const main = page.getByRole("main");
  const row = main.locator("ol > li").first();
  const card = row.locator(":scope > div").last();
  await expect(card).toBeVisible();
  await card.evaluate((target) => {
    for (const [type, x, y] of [["touchstart", 50, 100], ["touchmove", 160, 130], ["touchend", 160, 130]] as const) {
      const touch = new Touch({ identifier: 1, target, clientX: x, clientY: y });
      target.dispatchEvent(new TouchEvent(type, { bubbles: true, touches: type === "touchend" ? [] : [touch] }));
    }
  });
  await expect(main.getByRole("dialog")).toHaveCount(0);
  await expect(main.getByText(/swipe right to call/i)).toHaveCount(0);
  await row.getByRole("button", { name: "Log outcome" }).click();
  await expect(row.getByRole("combobox", { name: "Outcome" })).toBeVisible();
});

test("the WhatsApp simulator is available only in the opt-in demo queue", async ({ page }) => {
  await page.goto("/calls");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Call queue" })).toBeVisible();
  await expect(main.getByRole("button", { name: /WhatsApp bot/i })).toHaveCount(0);
  await page.goto("/calls?simulator=1");
  const simulator = main.getByRole("button", { name: "WhatsApp bot", exact: true });
  await expect(simulator).toBeVisible();
  await simulator.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
