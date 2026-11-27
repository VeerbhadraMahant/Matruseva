import { defineArea } from "../define";

// Area: printable postnatal handover summary (/patients/[id]/postnatal-summary).
export const postnatalSummary = defineArea({
  en: {
    "postnatalSummary.title": "Postnatal handover summary",
  },
  hi: {
    "postnatalSummary.title": "प्रसवोत्तर हैंडओवर सारांश",
  },
  mr: {
    "postnatalSummary.title": "प्रसूतीनंतरचा हस्तांतरण सारांश",
  },
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
