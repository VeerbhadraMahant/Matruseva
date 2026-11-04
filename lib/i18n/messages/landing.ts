import { defineArea } from "../define";

// Area: public marketing landing page
// Owned by the agent translating this area: add keys ONLY here, prefixed
// "landing." (flat dotted keys, e.g. "landing.title"). Every key needs en + hi + mr
// (compile error otherwise). See docs/I18N.md and lib/i18n/GLOSSARY.md.
export const landing = defineArea({
  en: {},
  hi: {},
  mr: {},
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
