// Plain module (NO "use client", NO "use server", no imports with side effects).
// Server components, client components, actions and tests all import these
// constants from here. A server component importing a constant from a
// "use client" file receives a client reference instead of the value.

export const LOCALES = ["en", "hi", "mr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ms_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year, seconds

/** Names shown in the language switcher: always in the language's own script. */
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Validates untrusted input (cookie, form value); falls back to the default. */
export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
