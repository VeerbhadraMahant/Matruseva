import type { Page } from "@playwright/test";

/** Demo-mode sign in (server needs DEMO_MODE=1). */
export async function demoSignIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Demo sign in" }).click();
  await page.waitForURL("**/today");
}

export const PATIENT = "p1-pooja-deshmukh";
