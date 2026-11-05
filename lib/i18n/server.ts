import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./config";
import { makeTranslator, type Translator } from "./translate";

/** Active locale for this request (validated cookie, default English). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return resolveLocale(store.get(LOCALE_COOKIE)?.value);
}

/**
 * Server-component translator. Identical call syntax to client useT():
 *   const { t, locale } = await getT();
 *   t("calls.filter.overdue"); t("common.unit.day", { count: 3 });
 */
export async function getT(): Promise<{ t: Translator; locale: Locale }> {
  const locale = await getLocale();
  return { t: makeTranslator(locale), locale };
}
