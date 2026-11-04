import { defineArea } from "../define";

// Area: patient list, new patient, search
// Owned by the agent translating this area: add keys ONLY here, prefixed
// "patients." (flat dotted keys, e.g. "patients.title"). Every key needs en + hi + mr
// (compile error otherwise). See docs/I18N.md and lib/i18n/GLOSSARY.md.
export const patients = defineArea({
  en: {},
  hi: {},
  mr: {},
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
