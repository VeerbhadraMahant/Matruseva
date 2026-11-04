import { defineArea } from "../define";

// Area: clinic settings, thresholds, protocol sign-off
// Owned by the agent translating this area: add keys ONLY here, prefixed
// "settings." (flat dotted keys, e.g. "settings.title"). Every key needs en + hi + mr
// (compile error otherwise). See docs/I18N.md and lib/i18n/GLOSSARY.md.
export const settings = defineArea({
  en: {},
  hi: {},
  mr: {},
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
