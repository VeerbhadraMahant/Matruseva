import { defineArea } from "../define";

// Area: document capture, OCR, assignment
// Owned by the agent translating this area: add keys ONLY here, prefixed
// "documents." (flat dotted keys, e.g. "documents.title"). Every key needs en + hi + mr
// (compile error otherwise). See docs/I18N.md and lib/i18n/GLOSSARY.md.
export const documents = defineArea({
  en: {},
  hi: {},
  mr: {},
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
