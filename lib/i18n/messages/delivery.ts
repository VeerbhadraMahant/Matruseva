import { defineArea } from "../define";

// Area: the delivery (close pregnancy) dialog, including the per-baby fields.
export const delivery = defineArea({
  en: {
    "delivery.title": "Record delivery",
    "delivery.babyCount": "Number of babies",
    "delivery.gaAtBirth": "Gestational age at birth: {weeks} weeks",
    "delivery.babyN": "Baby {n}",
    "delivery.sex": "Sex",
    "delivery.sex.none": "Not recorded",
    "delivery.sex.female": "Female",
    "delivery.sex.male": "Male",
    "delivery.sex.ambiguous": "Ambiguous",
    "delivery.nicu": "Admitted to NICU/SNCU",
    "delivery.nicuShort": "NICU/SNCU",
    "delivery.flag.vlbw": "Very low birth weight: needs close follow-up.",
    "delivery.flag.lbw": "Low birth weight: needs close follow-up.",
    "delivery.flag.very_preterm": "Very preterm birth.",
    "delivery.flag.preterm": "Preterm birth.",
  },
  hi: {
    "delivery.title": "प्रसव दर्ज करें",
    "delivery.babyCount": "शिशुओं की संख्या",
    "delivery.gaAtBirth": "जन्म के समय गर्भावस्था: {weeks} सप्ताह",
    "delivery.babyN": "शिशु {n}",
    "delivery.sex": "लिंग",
    "delivery.sex.none": "दर्ज नहीं",
    "delivery.sex.female": "बालिका",
    "delivery.sex.male": "बालक",
    "delivery.sex.ambiguous": "अस्पष्ट",
    "delivery.nicu": "NICU/SNCU में भर्ती",
    "delivery.nicuShort": "NICU/SNCU",
    "delivery.flag.vlbw": "बहुत कम जन्म वज़न: नज़दीकी फ़ॉलो-अप ज़रूरी।",
    "delivery.flag.lbw": "कम जन्म वज़न: नज़दीकी फ़ॉलो-अप ज़रूरी।",
    "delivery.flag.very_preterm": "बहुत समय से पहले जन्म।",
    "delivery.flag.preterm": "समय से पहले जन्म।",
  },
  mr: {
    "delivery.title": "प्रसूती नोंदवा",
    "delivery.babyCount": "बाळांची संख्या",
    "delivery.gaAtBirth": "जन्माच्या वेळी गर्भधारणेचा कालावधी: {weeks} आठवडे",
    "delivery.babyN": "बाळ {n}",
    "delivery.sex": "लिंग",
    "delivery.sex.none": "नोंदवले नाही",
    "delivery.sex.female": "मुलगी",
    "delivery.sex.male": "मुलगा",
    "delivery.sex.ambiguous": "अस्पष्ट",
    "delivery.nicu": "NICU/SNCU मध्ये दाखल",
    "delivery.nicuShort": "NICU/SNCU",
    "delivery.flag.vlbw": "जन्माचे वजन खूप कमी: जवळून पाठपुरावा आवश्यक.",
    "delivery.flag.lbw": "जन्माचे वजन कमी: जवळून पाठपुरावा आवश्यक.",
    "delivery.flag.very_preterm": "खूप अकाली जन्म.",
    "delivery.flag.preterm": "अकाली जन्म.",
  },
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = ["delivery.nicuShort"];
