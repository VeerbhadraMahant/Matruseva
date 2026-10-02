"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { logDemoBatchContacts } from "@/lib/demo-data";
import type { ContactOutcome } from "@/lib/supabase/enums";

export interface ActionResult {
  error: string | null;
}

export interface BatchContactResult {
  error: string | null;
  loggedCount: number;
  skippedCount: number;
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

const batchContactSchema = z.object({
  patientIds: z
    .array(z.string().min(1))
    .min(1, "At least one patient must be selected")
    .max(100, "Cannot batch log more than 100 contacts at a time"),
  outcome: z.enum(["reached", "no_answer", "wrong_number", "will_visit", "refused"], {
    message: "Invalid contact outcome selected",
  }),
  channel: z.enum(["call", "whatsapp"]).default("call"),
  notes: z.string().optional(),
});

export async function logBatchContacts(
  patientIds: string[],
  outcome: ContactOutcome,
  notes?: string,
  channel: "call" | "whatsapp" = "call"
): Promise<BatchContactResult> {
  const parsed = batchContactSchema.safeParse({ patientIds, outcome, notes, channel });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid batch contact input",
      loggedCount: 0,
      skippedCount: 0,
    };
  }

  const valid = parsed.data;
  const [cookieStore, me] = await Promise.all([cookies(), getCurrentUser()]);
  const isDemo = cookieStore.get("matrusetu_demo")?.value === "1";

  if (isDemo) {
    const demoRes = logDemoBatchContacts(valid.patientIds, valid.outcome, valid.notes);
    revalidatePath("/calls");
    revalidatePath("/today");
    return demoRes;
  }

  const supabase = await createClient();

  // Query patient records to verify clinic match and filter out delivered/closed pregnancies
  const { data: patients, error: fetchErr } = await supabase
    .from("patients")
    .select("id, status, pregnancy_status")
    .in("id", valid.patientIds);

  if (fetchErr) {
    return { error: fetchErr.message, loggedCount: 0, skippedCount: 0 };
  }

  const patientMap = new Map((patients ?? []).map((p) => [p.id, p]));
  const toInsert: {
    patient_id: string;
    clinic_id: string;
    channel: string;
    outcome: string;
    notes: string | null;
    created_by: string;
  }[] = [];

  let skippedCount = 0;

  for (const pid of valid.patientIds) {
    const p = patientMap.get(pid);
    if (
      !p ||
      p.status === "delivered" ||
      p.status === "closed" ||
      p.pregnancy_status === "delivered" ||
      p.pregnancy_status === "closed"
    ) {
      skippedCount++;
      continue;
    }

    toInsert.push({
      patient_id: pid,
      clinic_id: me.clinicId,
      channel: valid.channel,
      outcome: valid.outcome,
      notes: valid.notes || null,
      created_by: me.userId,
    });
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from("contact_log").insert(toInsert);
    if (insertErr) {
      return { error: insertErr.message, loggedCount: 0, skippedCount };
    }
  }

  revalidatePath("/calls");
  revalidatePath("/today");
  return { error: null, loggedCount: toInsert.length, skippedCount };
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

