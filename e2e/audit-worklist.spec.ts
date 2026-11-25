import { expect, test, type Locator } from "@playwright/test";

async function countIn(locator: Locator) {
  await expect(locator).toBeVisible();
  const match = (await locator.innerText()).match(/\d+/);
  expect(match).not.toBeNull();
  return Number(match?.[0]);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Demo sign in" }).click();
  await page.waitForURL("**/today");
});

test("Today, Patients and Calls use the same follow-up counts", async ({ page }) => {
  const main = page.getByRole("main");
  const hero = main.getByRole("region", { name: "Patients due today" });
  const filters = main.getByRole("group", { name: "Filter worklist" });
  const due = filters.getByRole("button", { name: /^Due today/ });
  const dueCount = await countIn(due);
  await expect.poll(async () => Number((await hero.innerText()).match(/\d+/)?.[0])).toBe(dueCount);
  await due.click();
  await expect(main.locator('[aria-live="polite"]')).toHaveText(new RegExp(`^${dueCount} patients? shown$`));

  const riskCount = await countIn(filters.getByRole("button", { name: /^At risk/ }));
  const overdueCount = await countIn(filters.getByRole("button", { name: /^Overdue/ }));
  await expect(hero.getByRole("link", { name: new RegExp(`^${riskCount} At risk$`) })).toBeVisible();
  await expect(hero.getByRole("link", { name: new RegExp(`^${overdueCount} Overdue$`) })).toBeVisible();

  const sidebar = page.getByRole("navigation", { name: "Primary" });
  const badge = sidebar.getByText(/patients? (overdue|need[s]? follow-up)/);
  await expect(badge).toBeAttached();
  const badgeCount = Number((await badge.textContent())?.match(/\d+/)?.[0]);
  await hero.getByRole("link", { name: /At risk$/ }).click();

  const callFilters = main.getByRole("group", { name: "Filter queue" });
  await expect(callFilters.getByRole("button", { name: /^At risk/ })).toHaveAttribute("aria-pressed", "true");
  expect(await countIn(callFilters.getByRole("button", { name: /^At risk/ }))).toBe(riskCount);
  expect(await countIn(callFilters.getByRole("button", { name: /^Overdue/ }))).toBe(overdueCount);
  expect(await countIn(callFilters.getByRole("button", { name: /^All/ }))).toBe(badgeCount);
  await expect(main.getByText(new RegExp(`^${badgeCount} needs? follow-up`))).toBeVisible();

  await page.goto("/patients");
  expect(await countIn(main.getByRole("tab", { name: /^At risk/ }))).toBe(riskCount);
  expect(await countIn(main.getByRole("tab", { name: /^Overdue/ }))).toBe(overdueCount);
});

test("patient history, risk, blood pressure and schedule agree across surfaces", async ({ page }) => {
  const main = page.getByRole("main");
  const sunita = main.getByRole("button", { name: /Sunita Verma/ });
  await sunita.click();
  const sunitaRow = main.locator("li").filter({ hasText: "Sunita Verma" });
  const ogtt = sunitaRow.getByText(/OGTT.*· (by|was due)/i);
  await expect(ogtt).toBeVisible();
  const dueDate = (await ogtt.innerText()).match(/\d{1,2} [A-Za-z]{3}/)?.[0];
  expect(dueDate).toBeDefined();
  await sunitaRow.getByRole("link", { name: "Open record" }).click();
  await expect(main.getByRole("heading", { name: "Sunita Verma" })).toBeVisible();
  const scheduleItem = main.getByRole("row", { name: /OGTT/i });
  await expect(scheduleItem).toContainText(dueDate!);
  await expect(main.getByText(/Pre-hypertension/i).first()).toBeVisible();
  await expect(main.getByText(/Blood pressure within normal limits/i)).toHaveCount(0);
  await expect(main.getByText("Reached", { exact: true }).first()).toBeVisible();

  await page.goto("/calls");
  const callRow = main.locator("ol > li").filter({ hasText: "Sunita Verma" });
  await expect(callRow.getByText(/Reached/i).first()).toBeVisible();
  await expect(callRow.getByText(/[1-9]\d* attempts? in 30d/)).toBeVisible();
});
