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

const patientDialogs = [
  {
    trigger: "AI voice counselling",
    title: "AI regional-language audio counselling",
    action: "Copy counselling text",
  },
  {
    trigger: "Nutrition & diet plan",
    title: "Personalised nutrition & anaemia care plan",
    action: "Send via WhatsApp",
  },
  {
    trigger: "Edit patient & dating",
    title: "Edit patient & pregnancy dating",
    action: "Save & recalculate",
  },
];

for (const { trigger, title, action } of patientDialogs) {
  test(`${trigger} opens a wide patient dialog above the site header`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto("/patients/p1-pooja-deshmukh");
    await page.getByText("More", { exact: true }).click();
    const open = page.getByRole("button", { name: trigger, exact: true });
    await open.click();

    const dialog = page.getByRole("dialog");
    const heading = dialog.getByRole("heading", { name: title, exact: true });
    const close = dialog.getByRole("button", { name: "Close", exact: true }).first();
    await expect(heading).toBeInViewport({ ratio: 1 });
    await expect.poll(() => heading.evaluate((element) => {
      const { x, y, height } = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(x + 2, y + height / 2));
    })).toBe(true);
    expect((await close.boundingBox())!.x - (await heading.boundingBox())!.x).toBeGreaterThan(800);

    await page.setViewportSize({ width: 320, height: 600 });
    const footerAction = dialog.getByRole("button", { name: action, exact: true })
      .or(dialog.getByRole("link", { name: action, exact: true }));
    await footerAction.scrollIntoViewIfNeeded();
    await expect(footerAction).toBeInViewport({ ratio: 1 });
    await expect(heading).toBeInViewport({ ratio: 1 });
    await expect(close).toBeInViewport({ ratio: 1 });
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();

    await open.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
}

test("the diet plan uses most of a wide screen and keeps the text readable on a phone", async ({ page }) => {
  const desktop = { width: 1920, height: 900 };
  await page.setViewportSize(desktop);
  await page.goto("/patients/p1-pooja-deshmukh");
  await page.getByText("More", { exact: true }).click();
  await page.getByRole("button", { name: "Nutrition & diet plan", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Personalised nutrition and anaemia plan" });
  const panel = dialog.locator(":scope > div");
  await expect(panel).toBeInViewport({ ratio: 1 });
  const size = (await panel.boundingBox())!;
  expect(size.width).toBeGreaterThanOrEqual(desktop.width * 0.8);
  expect(size.height).toBeGreaterThanOrEqual(desktop.height * 0.9);

  const goal = dialog.getByText("Clinical goal:", { exact: true });
  await expect(goal).toHaveCSS("font-size", "16px");

  await page.setViewportSize({ width: 320, height: 600 });
  await expect(panel).toBeInViewport({ ratio: 1 });
  await expect(goal).toHaveCSS("font-size", "14px");
  const rules = dialog.getByText("3 essential iron tablet rules (counselling for the mother)", { exact: true });
  await rules.scrollIntoViewIfNeeded();
  await expect(rules).toBeInViewport({ ratio: 1 });
  await expect(dialog.getByRole("link", { name: "Send via WhatsApp" })).toBeInViewport({ ratio: 1 });
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

test("registration warns about a matching name and phone and retains entered values", async ({ page }) => {
  await page.goto("/patients/new");
  await page.locator("#name").fill(" sunita   verma ");
  await page.locator("#phone").fill("+91 98450-12345");
  const lmp = new Date(Date.now() - 70 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Register & generate schedule" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(/already registered/i);
  await expect(page).toHaveURL(/\/patients\/new$/);
  await expect(page.locator("#name")).toHaveValue(" sunita   verma ");
  await expect(page.locator("#phone")).toHaveValue("+91 98450-12345");
  await expect(page.locator("#lmp")).toHaveValue(lmp);
});

test("registration shows LMP before an English questionnaire with consecutive numbering", async ({ page }) => {
  await page.goto("/patients/new");
  const questionnaire = page.getByRole("group", { name: /Obstetric & Past Pregnancy Questionnaire/ });
  await expect(questionnaire).toBeVisible();
  const lmp = page.locator("#lmp");
  expect((await lmp.boundingBox())!.y).toBeLessThan((await questionnaire.boundingBox())!.y);
  expect(await questionnaire.innerText()).not.toMatch(/[\u0900-\u097f]/);
  const visibleNumbers = async () => [...(await questionnaire.innerText()).matchAll(/^(\d+)\. /gm)].map((match) => Number(match[1]));
  expect(await visibleNumbers()).toEqual([1, 2, 3, 4]);
  await questionnaire.getByRole("button", { name: /Normal Vaginal/ }).click();
  expect(await visibleNumbers()).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

test("a past booked visit has the same date and follow-up risk across screens", async ({ page }) => {
  await page.goto("/patients/p4-priya-sharma");
  const main = page.getByRole("main");
  const bookedDate = new Date(Date.now() - 24 * 86400000);
  await main.locator("#nextVisitDate").fill(bookedDate.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }));
  await main.getByRole("button", { name: "Save visit", exact: true }).click();
  await expect(main.getByText(/24d ago/)).toBeVisible();
  await expect(main.getByText("Lost to follow-up", { exact: true }).first()).toBeVisible();
  await page.goto("/calls?f=lost");
  await expect(main.locator("ol > li").filter({ hasText: "Priya Sharma" })).toBeVisible();
});

test("contact history shows a date without a time for a date-only entry", async ({ page }) => {
  await page.goto("/patients/p2-sunita-verma");
  const row = page.getByRole("main").getByRole("listitem").filter({ hasText: /WhatsApp.*Reached/i });
  const date = new Date(Date.now() - 2 * 86400000).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
  });
  await expect(row.locator("time")).toHaveText(date);
});

test("a closed pregnancy does not block registering a later pregnancy", async ({ page }) => {
  const name = `Audit return visit ${Date.now()}`;
  const phone = String(9000000000 + Date.now() % 1000000000);
  const date = new Date(Date.now() - 270 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  async function register(lmp: string) {
    await page.goto("/patients/new");
    await page.locator("#name").fill(name);
    await page.locator("#phone").fill(phone);
    await page.locator("#lmp").fill(lmp);
    await page.getByRole("button", { name: "Register & generate schedule" }).click();
    await expect(page).toHaveURL(/\/patients\/p-demo-/);
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }

  await register(date);
  const firstRecord = page.url();
  await page.getByText("More", { exact: true }).click();
  await page.getByRole("button", { name: "Record delivery / close", exact: true }).click();
  const close = page.getByRole("dialog", { name: "Record delivery outcome" });
  await close.locator("#birth-weight").fill("3.1");
  await close.getByRole("button", { name: "Next: confirm" }).click();
  await close.getByRole("button", { name: "Confirm and close record" }).click();
  await expect(page.getByRole("heading", { name: /Delivery outcome/ })).toBeVisible();

  await register(new Date(Date.now() - 65 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  expect(page.url()).not.toBe(firstRecord);
});
