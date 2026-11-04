import { defineArea } from "../define";

// Area: login, signup, onboarding, auth shell
// Owned by the agent translating this area: add keys ONLY here, prefixed
// "auth." (flat dotted keys, e.g. "auth.title"). Every key needs en + hi + mr
// (compile error otherwise). See docs/I18N.md and lib/i18n/GLOSSARY.md.
export const auth = defineArea({
  en: {},
  hi: {},
  mr: {},
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
