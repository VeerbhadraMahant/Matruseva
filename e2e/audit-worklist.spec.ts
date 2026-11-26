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
  await expect(callRow.getByText(/Never contacted/i)).toHaveCount(0);
  await expect(callRow.getByText(/[1-9]\d* attempts? in 30d/)).toBeVisible();
});

test("a booked visit and task on the same day share one patient row", async ({ page }) => {
  const main = page.getByRole("main");
  await page.goto("/patients/p3-kavita-patel");
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 4);
  const nextDateInput = nextDate.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
  await main.locator("#nextVisitDate").fill(nextDateInput);
  const note = `Audit grouped tasks ${Date.now()}`;
  await main.locator("#notes").fill(note);
  await main.getByRole("button", { name: "Save visit", exact: true }).click();
  await expect(main.getByRole("row", { name: new RegExp(note) })).toBeVisible();
  await page.goto("/today");
  const days = main.getByRole("group", { name: "Choose a day" });
  const day = days.getByRole("button").nth(4);
  const count = Number((await day.getAttribute("aria-label"))?.match(/(\d+) patients?$/)?.[1]);
  await day.click();
  const dayRows = main.getByRole("region", { name: /^Worklist/ }).getByRole("listitem");
  await expect(dayRows).toHaveCount(count);
  const kavita = dayRows.filter({ hasText: "Kavita Patel" });
  await expect(kavita).toHaveCount(1);
  await expect(kavita.getByRole("button", { name: /Visit booked.*NT Scan/i })).toBeVisible();
  await kavita.getByRole("button", { name: /Kavita Patel/i }).click();
  await expect(kavita.getByText(/NT Scan.*by/i)).toBeVisible();
});

test("batch reminders are logged without increasing successful contacts", async ({ page }) => {
  const main = page.getByRole("main");
  const stats = main.getByText(/\d+ of \d+ reached/);
  await expect(stats).toBeVisible();
  const before = (await stats.innerText()).match(/\d+/g)!.map(Number);
  await page.goto("/calls");
  const sunita = main.locator("ol > li").filter({ hasText: "Sunita Verma" });
  await sunita.getByRole("checkbox").check();
  await main.locator("#batch-outcome").selectOption("automated_reminder");
  await page.getByRole("button", { name: "Log for 1 selected" }).click();
  await page.getByRole("button", { name: "Yes, Log Contacts" }).click();
  await expect(sunita.getByText("Automated reminder sent (WhatsApp)", { exact: true }).first()).toBeVisible();
  await main.getByRole("group", { name: "Filter queue" }).getByRole("button", { name: /^Not called today/ }).click();
  await expect(sunita).toBeVisible();
  await page.goto("/patients/p2-sunita-verma");
  await expect(main.getByText("Automated reminder sent (WhatsApp)", { exact: true }).first()).toBeVisible();
  await page.goto("/today");
  await expect(stats).toHaveText(`${before[0]} of ${before[1] + 1} reached`);
});

test("Today puts work first and wraps worklist filters on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const main = page.getByRole("main");
  const worklist = main.getByRole("heading", { name: /^Worklist/ });
  const hero = main.getByRole("region", { name: "Patients due today" });
  const filters = main.getByRole("group", { name: "Filter worklist" });
  await expect(worklist).toBeInViewport();
  expect((await worklist.boundingBox())!.y).toBeLessThan((await hero.boundingBox())!.y);
  expect(await filters.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(filters.getByRole("button", { name: /^Due today/ })).toBeInViewport({ ratio: 1 });
});

test("Today counters render their final value before JavaScript and expose it once", async ({ page, browser }) => {
  const context = await browser.newContext({ storageState: await page.context().storageState() });
  try {
    await context.route(/\/_next\/static\/.*\.js(?:\?.*)?$/, (route) => route.abort());
    const ssr = await context.newPage();
    await ssr.goto("http://localhost:3000/today");
    const hero = ssr.getByRole("region", { name: "Patients due today" });
    const link = hero.getByRole("link", { name: /At risk$/ });
    const count = await countIn(ssr.getByRole("group", { name: "Filter worklist" }).getByRole("button", { name: /^At risk/ }));
    expect(count).toBeGreaterThan(0);
    expect((await link.textContent())?.trim().replace(/\s+/g, " ")).toBe(`${count}At risk`);
    await expect(link).toHaveAccessibleName(`${count} At risk`);
  } finally {
    await context.close();
  }
});

test("follow-up uses the recent manual outcomes in the contact record", async ({ page }) => {
  await page.goto("/calls");
  const row = page.getByRole("main").locator("ol > li").filter({ hasText: "Rekha Yadav" });
  await row.getByRole("button", { name: "Log outcome" }).click();
  const form = row.locator("form");
  async function log(outcome: string, label: string) {
    await form.getByRole("combobox", { name: "Outcome" }).selectOption(outcome);
    await form.getByRole("button", { name: "Log", exact: true }).click();
    await expect(row.getByText(label, { exact: true }).and(row.locator("span"))).toBeVisible();
  }
  await log("no_answer", "No answer");
  await log("wrong_number", "Wrong number");
  await expect(row.getByText("Unreachable ×2")).toBeVisible();
  await log("refused", "Refused");
  await expect(row.getByText(/Unreachable/)).toHaveCount(0);
});

test("the week strip includes tasks that open and close on a future date", async ({ page }) => {
  const name = `Audit week strip ${Date.now()}`;
  const lmp = new Date(Date.now() - (28 * 7 - 3) * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  await page.goto("/patients/new");
  await page.locator("#name").fill(name);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Register & generate schedule" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /Repeat CBC/ })).toContainText("Upcoming");
  await page.goto("/today");
  const main = page.getByRole("main");
  await main.getByRole("group", { name: "Choose a day" }).getByRole("button").nth(3).click();
  const patient = main.getByRole("region", { name: /^Worklist/ }).getByRole("listitem").filter({ hasText: name });
  await expect(patient).toHaveCount(1);
  await patient.getByRole("button", { name: new RegExp(name) }).click();
  await expect(patient.getByText(/Repeat CBC.*by/i)).toBeVisible();
});
