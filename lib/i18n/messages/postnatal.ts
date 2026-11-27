import { defineArea } from "../define";

// Area: postnatal care (mother + newborn, first 42 days): server action errors and the postnatal panel.
export const postnatal = defineArea({
  en: {
    "postnatal.title": "Postnatal care",
    "postnatal.error.invalidInput": "Please check the details entered.",
    "postnatal.error.notFound": "Postnatal record not found.",
    "postnatal.error.unknownBaby": "This baby does not belong to this patient.",
    "postnatal.error.vaccineDateInvalid": "Enter a valid vaccination date.",
    "postnatal.error.vaccineDateFuture": "Vaccination date cannot be in the future.",
    "postnatal.error.vaccineBeforeBirth": "Vaccination date cannot be before the baby's birth date.",
    "postnatal.error.dbConnection": "Database connection failed",
  },
  hi: {
    "postnatal.title": "प्रसवोत्तर देखभाल",
    "postnatal.error.invalidInput": "दर्ज की गई जानकारी जाँचें।",
    "postnatal.error.notFound": "प्रसवोत्तर रिकॉर्ड नहीं मिला।",
    "postnatal.error.unknownBaby": "यह शिशु इस मरीज़ का नहीं है।",
    "postnatal.error.vaccineDateInvalid": "टीकाकरण की सही तारीख़ दर्ज करें।",
    "postnatal.error.vaccineDateFuture": "टीकाकरण की तारीख़ भविष्य की नहीं हो सकती।",
    "postnatal.error.vaccineBeforeBirth": "टीकाकरण की तारीख़ शिशु के जन्म की तारीख़ से पहले की नहीं हो सकती।",
    "postnatal.error.dbConnection": "डेटाबेस से कनेक्शन नहीं हो सका",
  },
  mr: {
    "postnatal.title": "प्रसूतीनंतरची काळजी",
    "postnatal.error.invalidInput": "भरलेली माहिती तपासा.",
    "postnatal.error.notFound": "प्रसूतीनंतरची नोंद सापडली नाही.",
    "postnatal.error.unknownBaby": "हे बाळ या रुग्णाचे नाही.",
    "postnatal.error.vaccineDateInvalid": "लसीकरणाची योग्य तारीख नोंदवा.",
    "postnatal.error.vaccineDateFuture": "लसीकरणाची तारीख भविष्यातील असू शकत नाही.",
    "postnatal.error.vaccineBeforeBirth": "लसीकरणाची तारीख बाळाच्या जन्मतारखेपूर्वी असू शकत नाही.",
    "postnatal.error.dbConnection": "डेटाबेसशी कनेक्ट होऊ शकले नाही",
  },
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
