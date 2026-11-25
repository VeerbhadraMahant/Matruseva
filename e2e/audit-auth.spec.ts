import { expect, test } from "@playwright/test";

test("the landing hero is immediately readable and can enter the demo", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByRole("heading", { level: 1 });
  await expect(hero).toBeVisible();
  expect(await hero.evaluate((heading) => getComputedStyle(heading.parentElement!).opacity)).toBe("1");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
});

test("login shows and hides the password and offers a demo-safe reset", async ({ page }) => {
  await page.goto("/login");
  const password = page.locator("#password");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");

  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.getByLabel("Email", { exact: true }).fill("demo.doctor@matrusetu.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status").filter({ hasText: /reset emails are disabled/i })).toBeVisible();

  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/forgot-password$/);
});
