import { defineArea } from "../define";

// Area: Today dashboard
// Owned by the agent translating this area: add keys ONLY here, prefixed
// "today." (flat dotted keys, e.g. "today.title"). Every key needs en + hi + mr
// (compile error otherwise). See docs/I18N.md and lib/i18n/GLOSSARY.md.
export const today = defineArea({
  en: {},
  hi: {},
  mr: {},
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
