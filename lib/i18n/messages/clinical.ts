import { defineArea } from "../define";

// Area: clinical terms, alerts and protocol text shared across screens
// Owned by the agent translating this area: add keys ONLY here, prefixed
// "clinical." (flat dotted keys, e.g. "clinical.title"). Every key needs en + hi + mr
// (compile error otherwise). See docs/I18N.md and lib/i18n/GLOSSARY.md.
export const clinical = defineArea({
  en: {},
  hi: {},
  mr: {},
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
