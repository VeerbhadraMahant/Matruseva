/** India-only phone normalization and WhatsApp/tel deep links for the call queue. */

/** Strips formatting and adds the +91 country code to a 10-digit Indian mobile number. */
export function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(1);
  return null;
}

export function telLink(phone: string): string | null {
  const normalized = normalizeIndianPhone(phone);
  return normalized ? `tel:+${normalized}` : null;
}

export function whatsAppLink(phone: string, message: string): string | null {
  const normalized = normalizeIndianPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export type ReminderReason = "overdue" | "due_soon" | "at_risk" | "lost";
export type SupportedLanguage = "en" | "hi" | "mr";

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिंदी" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
];

/** Single-language template set */
export type ReasonTemplates = Partial<Record<ReminderReason, string>>;

/**
 * Per-clinic overrides, stored in clinics.message_templates (Settings).
 * Supports both legacy flat format { overdue: "..." } and multi-lingual format
 * { en: { ... }, hi: { ... }, mr: { ... }, default_lang?: "en" | "hi" | "mr" }.
 */
export type MessageTemplates = ReasonTemplates & {
  en?: ReasonTemplates;
  hi?: ReasonTemplates;
  mr?: ReasonTemplates;
  default_lang?: SupportedLanguage;
};

export const DEFAULT_TEMPLATES: Record<SupportedLanguage, Record<ReminderReason, string>> = {
  en: {
    overdue:
      "Hello, this is {name}'s clinic calling. Your {item} is now overdue — please visit us at the earliest, or call us to reschedule.",
    due_soon:
      "Hello, this is a reminder from {clinic} that {name}'s {item} is due soon. Please visit the clinic or call to schedule.",
    at_risk:
      "Hello, we haven't seen {name} at the clinic in a while. We hope everything is okay — please call us or visit when convenient.",
    lost:
      "Hello, we haven't seen {name} at the clinic in a while. We hope everything is okay — please call us or visit when convenient.",
  },
  hi: {
    overdue:
      "नमस्ते, {clinic} से संदेश: {name} जी, आपकी {item} की जांच की नियत तारीख निकल चुकी है। कृपया जल्द से जल्द क्लिनिक आएं या नई तारीख के लिए संपर्क करें।",
    due_soon:
      "नमस्ते, {clinic} की ओर से याददिहानी: {name} जी, आपकी {item} की जांच का समय नजदीक है। कृपया क्लिनिक पधारें या जांच का समय तय करने के लिए कॉल करें।",
    at_risk:
      "नमस्ते, हम {clinic} से बोल रहे हैं। काफी समय से {name} जी क्लिनिक नहीं आई हैं। आशा है आप और शिशु दोनों स्वस्थ हैं। कृपया अपनी नियमित जांच के लिए जल्द संपर्क करें।",
    lost:
      "नमस्ते, {clinic} से आवश्यक सूचना: गर्भावस्था में नियमित जांच {name} जी और शिशु के स्वास्थ्य के लिए अत्यंत आवश्यक है। कृपया कुशलक्षेम व जांच हेतु क्लिनिक से तुरंत संपर्क करें।",
  },
  mr: {
    overdue:
      "नमस्कार, {clinic} कडून संदेश: {name} ताई, आपली {item} तपासणीची मुदत संपली आहे. कृपया लवकरात लवकर क्लिनिकला भेट द्या किंवा नवीन तारीख ठरवण्यासाठी संपर्क करा.",
    due_soon:
      "नमस्कार, {clinic} कडून आठवण: {name} ताई, आपली {item} तपासणीची वेळ जवळ आली आहे. कृपया क्लिनिकला भेट द्या किंवा वेळेचे नियोजन करण्यासाठी संपर्क करा.",
    at_risk:
      "नमस्कार, आम्ही {clinic} मधून बोलत आहोत. बऱ्याच दिवसांत {name} ताई क्लिनिकमध्ये आलेल्या नाहीत. आपण व बाळ सुखरूप असाल अशी आशा आहे. कृपया तपासणीसाठी लवकर भेट द्या.",
    lost:
      "नमस्कार, {clinic} कडून महत्त्वाची सूचना: गरोदरपणातील वेळेवर तपासणी {name} ताई आणि बाळाच्या आरोग्यासाठी अत्यंत आवश्यक आहे. कृपया तपासणी व सल्ल्यासाठी त्वरित क्लिनिकशी संपर्क साधा.",
  },
};

const DEFAULT_ITEM_LABEL: Record<SupportedLanguage, string> = {
  en: "checkup",
  hi: "नियमित जांच",
  mr: "नियमित तपासणी",
};

const DEFAULT_CLINIC_LABEL: Record<SupportedLanguage, string> = {
  en: "the clinic",
  hi: "क्लिनिक",
  mr: "क्लिनिक",
};

/**
 * Resolves template text for a given reason and language, handling both legacy flat
 * templates and nested multi-lingual templates.
 */
export function resolveTemplateText(
  reason: ReminderReason,
  lang: SupportedLanguage = "en",
  templates?: MessageTemplates
): string {
  if (!templates) return DEFAULT_TEMPLATES[lang][reason];

  // 1. Check nested language block (e.g. templates.hi?.overdue)
  const nested = templates[lang] as ReasonTemplates | undefined;
  if (nested?.[reason]?.trim()) {
    return nested[reason]!.trim();
  }

  // 2. Check legacy flat format if language is 'en' (e.g. templates.overdue)
  if (lang === "en" && templates[reason]?.trim()) {
    return templates[reason]!.trim();
  }

  // 3. Fallback to built-in default for this language
  return DEFAULT_TEMPLATES[lang][reason];
}

/** Fills a clinic's template (or default) with patient name, item name, and clinic name. */
export function reminderMessage(
  patientName: string,
  reason: ReminderReason,
  careEventName?: string,
  templates?: MessageTemplates,
  lang: SupportedLanguage = "en",
  clinicName?: string
): string {
  const template = resolveTemplateText(reason, lang, templates);
  const item = careEventName?.trim() || DEFAULT_ITEM_LABEL[lang];
  const clinic = clinicName?.trim() || DEFAULT_CLINIC_LABEL[lang];

  return template
    .replace(/\{name\}/g, patientName)
    .replace(/\{item\}/g, item)
    .replace(/\{clinic\}/g, clinic);
}

/** Generates reminder messages for all 3 supported languages at once. */
export function allLanguageMessages(
  patientName: string,
  reason: ReminderReason,
  careEventName?: string,
  templates?: MessageTemplates,
  clinicName?: string
): Record<SupportedLanguage, string> {
  return {
    en: reminderMessage(patientName, reason, careEventName, templates, "en", clinicName),
    hi: reminderMessage(patientName, reason, careEventName, templates, "hi", clinicName),
    mr: reminderMessage(patientName, reason, careEventName, templates, "mr", clinicName),
  };
}
