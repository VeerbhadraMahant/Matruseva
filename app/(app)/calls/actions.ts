"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export interface ActionResult {
  error: string | null;
}

const contactSchema = z.object({
  channel: z.enum(["call", "whatsapp"]),
  outcome: z.enum(["reached", "no_answer", "wrong_number", "will_visit", "refused"]),
  reason: z.string().optional(),
});

export async function logContact(patientId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const [supabase, me] = await Promise.all([createClient(), getCurrentUser()]);

  const { error } = await supabase.from("contact_log").insert({
    patient_id: patientId,
    clinic_id: me.clinicId,
    channel: parsed.data.channel,
    outcome: parsed.data.outcome,
    reason: parsed.data.reason || null,
    created_by: me.userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/calls");
  revalidatePath(`/patients/${patientId}`);
  return { error: null };
}

export async function quickLogContact(
  patientId: string,
  channel: "call" | "whatsapp",
  outcome: "reached" | "no_answer" | "wrong_number" | "will_visit" | "refused",
  notes?: string
): Promise<ActionResult> {
  const [supabase, me] = await Promise.all([createClient(), getCurrentUser()]);

  const { error } = await supabase.from("contact_log").insert({
    patient_id: patientId,
    clinic_id: me.clinicId,
    channel,
    outcome,
    notes: notes || null,
    created_by: me.userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/calls");
  revalidatePath(`/patients/${patientId}`);
  return { error: null };
}

export async function dispatchBotReminder(
  patientId: string,
  patientName: string,
  careEventName: string | undefined,
  reason: "overdue" | "due_soon" | "at_risk" | "lost",
  lang: import("@/lib/whatsapp").SupportedLanguage
): Promise<{ error: string | null; reminderText?: string }> {
  const { buildAutomatedReminderMessage } = await import("@/lib/whatsappBot");
  const [supabase, me] = await Promise.all([createClient(), getCurrentUser()]);
  const { data: clinic } = await supabase.from("clinics").select("name").eq("id", me.clinicId).single();

  const reminderText = buildAutomatedReminderMessage({
    patientId,
    patientName,
    careEventName,
    reason,
    lang,
    clinicName: clinic?.name || "MatruSetu Clinic",
  });

  const { error } = await supabase.from("contact_log").insert({
    patient_id: patientId,
    clinic_id: me.clinicId,
    channel: "whatsapp",
    outcome: "reached",
    notes: `Automated Bot reminder sent (${lang.toUpperCase()}): "${reminderText.slice(0, 100)}..."`,
    created_by: me.userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/calls");
  revalidatePath(`/patients/${patientId}`);
  return { error: null, reminderText };
}

export async function processBotReply(
  patientId: string,
  replyText: string,
  lang: import("@/lib/whatsapp").SupportedLanguage
): Promise<{ error: string | null; result?: import("@/lib/whatsappBot").BotProcessResult }> {
  const { handleIncomingWhatsAppMessage } = await import("@/lib/whatsappBot");
  const result = await handleIncomingWhatsAppMessage({
    patientId,
    messageText: replyText,
    preferredLang: lang,
  });

  if (!result.success && result.error) {
    return { error: result.error };
  }

  revalidatePath("/calls");
  revalidatePath(`/patients/${patientId}`);
  return { error: null, result };
}

