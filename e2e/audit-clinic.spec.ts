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

test("Documents show distinguishable previews and file assigned pages out of the inbox", async ({ page }) => {
  const main = page.getByRole("main");
  await page.goto("/documents?q=OBSTETRIC");
  const report = main.getByText(/OBSTETRIC ULTRASOUND REPORT/);
  await expect(report).toBeVisible();
  const doc = main.getByRole("listitem").filter({ hasText: /OBSTETRIC ULTRASOUND REPORT/ });
  const assign = doc.getByRole("button", { name: "Assign" });
  if (await assign.isVisible()) {
    await doc.getByRole("textbox", { name: /Search patient by name/ }).fill("Pooja");
    await doc.getByRole("button", { name: /Pooja Deshmukh/ }).click();
    await assign.click();
  }
  await expect(doc.getByText("Pooja Deshmukh", { exact: true })).toBeVisible();
  await page.goto("/documents");
  await expect(main.getByText(/PATHOLOGY LAB REPORT/)).toBeVisible();
  await expect(report).toHaveCount(0);
});

test("OPD capture starts with today's date and explains date-based filing", async ({ page }) => {
  await page.goto("/opd");
  const main = page.getByRole("main");
  await expect(main.getByLabel("Date", { exact: true })).toHaveValue(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
  );
  await expect(main.getByText(/use the register date/i)).toBeVisible();
  await expect(main.getByText(/tag documents by hand/i)).toHaveCount(0);
  await expect(main.getByText(/OPD REGISTER - MATRUSETU CLINIC/i)).toBeVisible();
});

test("patient status fits in the table at laptop width", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/patients");
  const table = page.getByRole("table");
  const status = table.getByRole("columnheader", { name: "Status", exact: true });
  await expect(status).toBeInViewport({ ratio: 1 });
  const fits = await status.evaluate((cell) => cell.getBoundingClientRect().right <= cell.closest("table")!.parentElement!.getBoundingClientRect().right + 1);
  expect(fits).toBe(true);
});

test("mobile language, filter and patient name targets measure at least 44 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/patients");
  const main = page.getByRole("main");
  for (const target of [
    main.getByRole("tab", { name: /^All/ }),
    main.getByRole("link", { name: "Sunita Verma" }),
  ]) {
    await expect(target).toBeVisible();
    expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const language = page.getByRole("dialog", { name: "Main menu" }).getByRole("button", { name: "English", exact: true });
  await expect(language).toBeVisible();
  expect((await language.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("demo Settings show thresholds, schedule and message templates", async ({ page }) => {
  await page.goto("/settings");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: /Follow-up thresholds/ })).toBeVisible();
  await expect(main.getByRole("spinbutton").first()).toHaveValue("7");
  await expect(main.getByRole("heading", { name: /ANC schedule template/ })).toBeVisible();
  await expect(main.getByText(/Booking visit/i).first()).toBeVisible();
  await expect(main.getByRole("heading", { name: /Reminder message templates/ })).toBeVisible();
  await expect(main.locator("textarea").first()).not.toHaveValue("");
});
