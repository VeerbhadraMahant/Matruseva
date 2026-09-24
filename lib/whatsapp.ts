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

/**
 * Per-clinic overrides, stored in clinics.message_templates (Settings).
 * English only for now — Hindi/Marathi wording needs the Clinical Lead's
 * review before shipping, per the plan's open items.
 */
export type MessageTemplates = Partial<Record<ReminderReason, string>>;

const DEFAULT_TEMPLATES: Record<ReminderReason, string> = {
  overdue:
    "Hello, this is {name}'s clinic calling. Your {item} is now overdue — please visit us at the earliest, or call us to reschedule.",
  due_soon: "Hello, this is a reminder that {name}'s {item} is due soon. Please visit the clinic or call to schedule.",
  at_risk: "Hello, we haven't seen {name} at the clinic in a while. We hope everything is okay — please call us or visit when convenient.",
  lost: "Hello, we haven't seen {name} at the clinic in a while. We hope everything is okay — please call us or visit when convenient.",
};

/** Fills a clinic's custom template (or the built-in default) with the patient name and, if relevant, the care event name. */
export function reminderMessage(
  patientName: string,
  reason: ReminderReason,
  careEventName?: string,
  templates?: MessageTemplates
): string {
  const template = templates?.[reason]?.trim() || DEFAULT_TEMPLATES[reason];
  return template.replace(/\{name\}/g, patientName).replace(/\{item\}/g, careEventName ?? "checkup");
}
