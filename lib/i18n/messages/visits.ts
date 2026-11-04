import { defineArea } from "../define";

// Area: visit form and visit workspace
// Owned by the agent translating this area: add keys ONLY here, prefixed
// "visits." (flat dotted keys, e.g. "visits.title"). Every key needs en + hi + mr
// (compile error otherwise). See docs/I18N.md and lib/i18n/GLOSSARY.md.
export const visits = defineArea({
  en: {},
  hi: {},
  mr: {},
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
