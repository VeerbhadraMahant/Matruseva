"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "./config";

/** Persist the UI language and re-render every route with it. Invalid input is ignored. */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
