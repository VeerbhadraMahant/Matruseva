import { defineArea } from "../define";

// Area: OPD register (OCR status labels come from documents.ocr.*)
export const opd = defineArea({
  en: {
    "opd.title": "OPD register",
    "opd.meta": "Daily register and case-paper pages. Not tied to one patient — browse by date or search the text.",
    "opd.capture.panel": "Capture pages",
    "opd.panel": "Register",
    "opd.results": "Results for “{query}”",
    "opd.search.placeholder": "Search register text",
    "opd.search.aria": "Search register text",
    "opd.empty.search": "No pages matched.",
    "opd.empty.none": "No register pages captured yet.",
    "opd.undated": "No date tagged",
    "opd.pages_one": "{count} page",
    "opd.pages_other": "{count} pages",
  },
  hi: {
    "opd.title": "OPD रजिस्टर",
    "opd.meta": "रोज़ाना के रजिस्टर और केस पेपर के पन्ने। किसी एक मरीज़ से जुड़े नहीं — तारीख़ से देखें या टेक्स्ट खोजें।",
    "opd.capture.panel": "पन्ने कैप्चर करें",
    "opd.panel": "रजिस्टर",
    "opd.results": "“{query}” के परिणाम",
    "opd.search.placeholder": "रजिस्टर का टेक्स्ट खोजें",
    "opd.search.aria": "रजिस्टर का टेक्स्ट खोजें",
    "opd.empty.search": "कोई पन्ना नहीं मिला।",
    "opd.empty.none": "अभी तक कोई रजिस्टर पन्ना कैप्चर नहीं हुआ।",
    "opd.undated": "तारीख़ टैग नहीं की गई",
    "opd.pages_one": "{count} पन्ना",
    "opd.pages_other": "{count} पन्ने",
  },
  mr: {
    "opd.title": "OPD नोंदवही",
    "opd.meta": "दैनंदिन नोंदवही आणि केस पेपरची पाने. कोणत्याही एका रुग्णाशी जोडलेली नाहीत — तारखेनुसार पाहा किंवा मजकूर शोधा.",
    "opd.capture.panel": "पाने कॅप्चर करा",
    "opd.panel": "नोंदवही",
    "opd.results": "“{query}” साठी निकाल",
    "opd.search.placeholder": "नोंदवहीतील मजकूर शोधा",
    "opd.search.aria": "नोंदवहीतील मजकूर शोधा",
    "opd.empty.search": "कोणतेही पान सापडले नाही.",
    "opd.empty.none": "अद्याप नोंदवहीचे कोणतेही पान कॅप्चर केलेले नाही.",
    "opd.undated": "तारीख टॅग केलेली नाही",
    "opd.pages_one": "{count} पान",
    "opd.pages_other": "{count} पाने",
  },
});

/** Keys whose hi/mr value is intentionally identical to English (brand names, units). */
export const untranslated: string[] = [];
