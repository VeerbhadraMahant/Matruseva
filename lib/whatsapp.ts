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

/** Default English reminder message; clinics can override via message_templates in Settings later. */
export function defaultReminderMessage(patientName: string, reason: ReminderReason, careEventName?: string): string {
  switch (reason) {
    case "overdue":
      return `Hello, this is ${patientName}'s clinic calling. Your ${careEventName ?? "checkup"} is now overdue — please visit us at the earliest, or call us to reschedule.`;
    case "due_soon":
      return `Hello, this is a reminder that ${patientName}'s ${careEventName ?? "checkup"} is due soon. Please visit the clinic or call to schedule.`;
    case "at_risk":
    case "lost":
      return `Hello, we haven't seen ${patientName} at the clinic in a while. We hope everything is okay — please call us or visit when convenient.`;
  }
}
