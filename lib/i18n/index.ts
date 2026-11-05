// Server/test-side entry point. Client components should import from
// "@/lib/i18n/provider" (useT/useLocale) and "@/lib/i18n/config" instead, so
// the full multi-locale catalogue never lands in a client bundle.
import { AREAS, AREA_UNTRANSLATED } from "./messages";

export * from "./config";
export { intlLocale } from "./intl";
export { translate, makeTranslator } from "./translate";
export type { Translator, Params } from "./translate";
export { messages, AREAS } from "./messages";
export type { MessageKey, RawMessageKey } from "./messages";
export { defineArea } from "./define";

/**
 * Keys where hi/mr may equal English (brand names, units, numerals). Extend by
 * exporting `untranslated` from YOUR area file, never by editing this list.
 */
export const BASE_UNTRANSLATED: readonly string[] = [];

/** Base list unioned with every area file's `untranslated` export. */
export const UNTRANSLATED_ALLOWLIST: ReadonlySet<string> = new Set([
  ...BASE_UNTRANSLATED,
  ...Object.values(AREA_UNTRANSLATED).flat(),
]);

export type AreaName = keyof typeof AREAS;
