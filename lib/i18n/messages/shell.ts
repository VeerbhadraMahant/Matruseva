import { defineArea } from "../define";

// Area: app shell: sidebar, top bar, bottom nav, command palette entry
// Owned by the agent translating this area: add keys ONLY here, prefixed
// "shell." (flat dotted keys, e.g. "shell.title"). Every key needs en + hi + mr
// (compile error otherwise). See docs/I18N.md and lib/i18n/GLOSSARY.md.
export const shell = defineArea({
  en: {},
  hi: {},
  mr: {},
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
