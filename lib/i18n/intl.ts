import { DEFAULT_LOCALE, type Locale } from "./config";

const INTL_TAGS: Record<Locale, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

/**
 * BCP-47 tag for Intl APIs. Always forces Latin digits (0-9): clinical values
 * (dates, doses, vitals) stay readable and unambiguous in every language.
 */
export function intlLocale(locale: Locale = DEFAULT_LOCALE): string {
  return `${INTL_TAGS[locale]}-u-nu-latn`;
}
