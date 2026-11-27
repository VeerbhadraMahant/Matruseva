import { defineArea } from "../define";

// Area: the delivery (close pregnancy) dialog, including the per-baby fields.
export const delivery = defineArea({
  en: {
    "delivery.title": "Record delivery",
  },
  hi: {
    "delivery.title": "प्रसव दर्ज करें",
  },
  mr: {
    "delivery.title": "प्रसूती नोंदवा",
  },
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
