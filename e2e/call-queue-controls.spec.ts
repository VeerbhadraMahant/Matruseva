import { expect, test } from "@playwright/test";

for (const mobile of [false, true]) {
  test.describe(mobile ? "Touch controls" : "Desktop controls", () => {
    test.use({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
    });

    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("button", { name: "Demo sign in" }).click();
      await page.waitForURL("**/today");
    });

    test("filters, bulk selection and outcome dropdowns", async ({ page }) => {
      await page.goto("/calls");
      const activate = mobile ? "tap" : "click";
      const filters = page.getByRole("group", { name: "Filter queue" }).getByRole("button");
      const rows = page.locator("main ol > li");
      const all = page.getByRole("checkbox", { name: "Select all patients in this list" });
      const first = rows.first().getByRole("checkbox");
      await expect(rows.first()).toBeVisible();
      const total = await rows.count();
      expect(total).toBeGreaterThan(1);

      await first[activate]();
      await expect(all).toBeChecked({ indeterminate: true });
      await page.getByText(/Select all in queue/)[activate]();
      await expect(rows.locator("input:checked")).toHaveCount(total);
      await expect(all).toBeChecked();
      await page.locator("#batch-outcome").selectOption("will_visit");
      await expect(page.locator("#batch-outcome")).toHaveValue("will_visit");
      await all[activate]();
      await expect(rows.locator("input:checked")).toHaveCount(0);

      await all[activate]();
      for (const filter of (await filters.all()).slice(1)) {
        const count = Number(await filter.locator("span").innerText());
        await filter[activate]();
        await expect(filter).toHaveAttribute("aria-pressed", "true");
        await expect(rows).toHaveCount(count);
        await expect(page.getByRole("region", { name: "Batch contact actions" })).toHaveCount(0);
        if (count > 0) {
          await all[activate]();
          await expect(rows.locator("input:checked")).toHaveCount(count);
        }
      }
      await filters.first()[activate]();
      const languages = page.getByRole("group", { name: "Message language" }).getByRole("button");
      for (const language of await languages.all()) {
        await language[activate]();
        await expect(language).toHaveAttribute("aria-pressed", "true");
        await expect(rows.first().getByTitle(/Send WhatsApp reminder/)).toHaveAttribute("title", `Send WhatsApp reminder in ${await language.innerText()}`);
      }
      const log = rows.first().getByRole("button", { name: "Log outcome" });
      await log[activate]();
      const form = rows.first().locator("form");
      await form.getByRole("combobox", { name: "Contact channel" }).selectOption("whatsapp");
      await form.getByRole("combobox", { name: "Outcome" }).selectOption("no_answer");
      await expect(form.locator("select[name=outcome]")).toHaveValue("no_answer");
      await log[activate]();
      await expect(form).toHaveCount(0);
      if (mobile) {
        await rows.first().getByRole("link").first().tap();
        await page.waitForURL("**/patients/*");
        await page.getByRole("link", { name: "Calls", exact: true }).tap();
        await expect(page).toHaveURL(/\/calls$/);
      }
    });

    test("questionnaire labels, checkboxes and disclosure stay in sync", async ({ page }) => {
      const activate = mobile ? "tap" : "click";
      await page.goto("/patients/new");
      const toggle = page.getByRole("button", { name: /Past Pregnancy History & Clinical Questionnaire/ });
      const option = page.getByRole("checkbox", { name: /Chronic Hypertension/ });
      await option[activate]();
      await expect(option).toBeChecked();
      await expect(page.locator("[name=q_chronicConditions]")).toHaveValue('["hypertension"]');
      await page.getByText("Chronic Hypertension (Pre-pregnancy)", { exact: true })[activate]();
      await expect(option).not.toBeChecked();
      await expect(page.locator("[name=q_chronicConditions]")).toHaveValue('["none"]');
      await toggle[activate]();
      await expect(option).toHaveCount(0);
      await toggle.focus();
      await page.keyboard.press("Space");
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(option).toBeVisible();
    });
  });
}
