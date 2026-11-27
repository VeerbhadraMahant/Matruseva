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

for (const viewport of [{ width: 320, height: 740 }, { width: 1440, height: 900 }]) {
  test(`the top bar avatar opens the doctor profile above Settings at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/today");
    const avatar = page.getByRole("banner").getByRole("link", { name: "Doctor profile" });
    await expect(avatar).toHaveText("D");
    await expect(avatar).toBeInViewport({ ratio: 1 });
    await avatar.click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(avatar).toHaveAttribute("aria-current", "page");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Doctor profile", level: 1 })).toBeVisible();
    const profile = main.getByRole("region", { name: "Dr. Demo" });
    const settings = main.getByRole("region", { name: "Settings", exact: true });
    await expect(profile.getByText("Doctor", { exact: true })).toBeVisible();
    await expect(profile.getByText("MatruSetu Demo Clinic", { exact: true })).toBeVisible();
    await expect(profile.getByText("Demo profile", { exact: true })).toBeVisible();
    await expect(profile.getByRole("term").filter({ hasText: /^Degree$/ })).toBeVisible();
    await expect(profile.getByText("MBBS, MD", { exact: true })).toBeVisible();
    await expect(profile.getByRole("term").filter({ hasText: /^Years of experience$/ })).toBeVisible();
    await expect(profile.getByText("12", { exact: true })).toBeVisible();
    await expect(profile.getByText("Edit profile", { exact: true })).toBeVisible();
    expect((await profile.boundingBox())!.y).toBeLessThan((await settings.boundingBox())!.y);
    await expect(settings.getByText("Demo clinic settings are read-only.")).toBeVisible();
    await expect(settings.getByRole("heading", { name: /Follow-up thresholds/ })).toBeVisible();
    await expect(settings.getByRole("spinbutton").first()).toHaveValue("7");
    await expect(settings.getByRole("spinbutton").first()).toBeDisabled();
    const schedule = settings.getByRole("heading", { name: /ANC schedule template/ });
    const reminders = settings.getByRole("heading", { name: /Reminder message templates/ });
    await expect(schedule).toBeVisible();
    await expect(settings.getByText(/Booking visit/i).first()).toBeVisible();
    await expect(reminders).toBeVisible();
    await expect(settings.locator("textarea").first()).not.toHaveValue("");

    const schedulePosition = (await schedule.boundingBox())!;
    const remindersPosition = (await reminders.boundingBox())!;
    if (viewport.width >= 1280) {
      expect(remindersPosition.x).toBeGreaterThan(schedulePosition.x);
      expect(Math.abs(remindersPosition.y - schedulePosition.y)).toBeLessThan(8);
    } else {
      expect(remindersPosition.x).toBeCloseTo(schedulePosition.x);
      expect(remindersPosition.y).toBeGreaterThan(schedulePosition.y);
    }
  });
}

test("the doctor can edit and persist their demo profile without unlocking clinic settings", async ({ page }) => {
  await page.goto("/settings");
  const edit = page.getByText("Edit profile", { exact: true });
  await edit.click();
  const name = page.getByLabel("Full name", { exact: true });
  const degree = page.getByLabel("Degree", { exact: true });
  const years = page.getByLabel("Years of experience", { exact: true });
  const original = [await name.inputValue(), await degree.inputValue(), await years.inputValue()];
  const save = page.getByRole("button", { name: "Save profile", exact: true });
  try {
    await name.fill("Dr. Demo QA");
    await degree.fill("MBBS, DGO");
    await years.fill("8");
    await save.click();
    await expect(page.getByRole("heading", { name: "Dr. Demo QA", exact: true })).toBeVisible();
    await page.reload();
    const profile = page.getByRole("region", { name: "Dr. Demo QA", exact: true });
    await expect(profile.getByText("MBBS, DGO", { exact: true })).toBeVisible();
    await expect(profile.getByText("8", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save clinic details" })).toBeDisabled();
  } finally {
    if (!(await name.isVisible())) await edit.click();
    await name.fill(original[0]);
    await degree.fill(original[1]);
    await years.fill(original[2]);
    await save.click();
    await expect(page.getByRole("heading", { name: original[0], exact: true })).toBeVisible();
  }
});

test("a staff invitation requires an explicit acceptance and rejects demo tokens", async ({ page }) => {
  await page.goto("/auth/staff-invite?token_hash=demo-test-token");
  await expect(page.getByRole("heading", { name: "Your staff invitation" })).toBeVisible();
  await expect(page).toHaveURL(/token_hash=demo-test-token$/);
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page).toHaveURL(/\/auth\/staff-invite\?expired=1$/);
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("phone navigation has five links and the menu retains access to scanning", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today");
  const bottom = page.getByRole("navigation", { name: "Primary" });
  await expect(bottom.getByRole("link")).toHaveCount(5);
  await expect(bottom.getByRole("link", { name: "Today", exact: true })).toHaveCount(1);
  await expect(page.getByRole("banner").getByRole("link", { name: "Doctor profile" })).toBeVisible();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Main menu" });
  await expect(menu.getByRole("link", { name: "Settings", exact: true })).toHaveCount(0);
  await menu.getByRole("link", { name: "Scan QR Card" }).click();
  await expect(page).toHaveURL(/\/scan$/);
});

test("the desktop sidebar keeps accessible link names and drops duplicate navigation", async ({ page }) => {
  const sidebar = page.getByRole("complementary", { name: "Main menu" });
  const nav = sidebar.getByRole("navigation", { name: "Primary" });
  for (const name of ["Today", "Patients", "Scan QR Card", "Call queue", "Documents", "OPD register"]) {
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await sidebar.getByRole("button", { name: "Collapse sidebar", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Patients", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Call queue", exact: true })).toHaveAccessibleDescription(/patients? needs? follow-up/);
  await expect(sidebar.getByRole("button", { name: /^Find patient/ })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Settings", exact: true })).toHaveCount(0);
  const search = page.getByRole("banner").getByRole("button", { name: /^Find patient/ });
  await search.click();
  await expect(page.getByRole("dialog", { name: "Find patient or page" })).toBeVisible();
});

test("image-only PDFs have distinguishable first-page previews", async ({ page }) => {
  function pdf(fill: string) {
    const drawing = `${fill} rg 5 5 90 90 re f`;
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << >> /Contents 4 0 R >>",
      `<< /Length ${drawing.length} >>\nstream\n${drawing}\nendstream`,
    ];
    let contents = "%PDF-1.4\n";
    const offsets = objects.map((object, index) => {
      const offset = contents.length;
      contents += `${index + 1} 0 obj\n${object}\nendobj\n`;
      return offset;
    });
    const xref = contents.length;
    contents += `xref\n0 5\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}`;
    contents += `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(contents, "ascii");
  }

  await page.goto("/documents");
  const main = page.getByRole("main");
  const previews = main.locator('img[src^="data:image/jpeg"]');
  const before = await previews.count();
  await main.locator('input[type="file"]').setInputFiles([
    { name: "Red scan.pdf", mimeType: "application/pdf", buffer: pdf("1 0 0") },
    { name: "Blue scan.pdf", mimeType: "application/pdf", buffer: pdf("0 0 1") },
  ]);
  await expect(previews).toHaveCount(before + 2, { timeout: 15000 });
  expect(await previews.nth(0).getAttribute("src")).not.toBe(await previews.nth(1).getAttribute("src"));
});
