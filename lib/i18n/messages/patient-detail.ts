import { defineArea } from "../define";

// Area: patient detail page, timeline, health card
// Owned by the agent translating this area: add keys ONLY here, prefixed
// "patient-detail." (flat dotted keys, e.g. "patient-detail.title"). Every key needs en + hi + mr
// (compile error otherwise). See docs/I18N.md and lib/i18n/GLOSSARY.md.
export const patientDetail = defineArea({
  en: {},
  hi: {},
  mr: {},
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
