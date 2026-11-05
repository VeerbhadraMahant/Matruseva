"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isDemoActive } from "@/lib/auth";
import { logDemoBatchContacts, logDemoContact } from "@/lib/demo-data";
import { isDuplicateRequest } from "@/lib/idempotency";
import { getT } from "@/lib/i18n/server";
import type { ContactOutcome } from "@/lib/supabase/enums";

export interface ActionResult {
  error: string | null;
}

export interface BatchContactResult {
  error: string | null;
  loggedCount: number;
  skippedCount: number;
}

/** Every page that renders contact-log derived data for a patient. */
function revalidateContactViews(patientId: string) {
  revalidatePath("/calls");
  revalidatePath("/today");
  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
}

const contactSchema = z.object({
  channel: z.enum(["call", "whatsapp"]),
  outcome: z.enum(["reached", "no_answer", "wrong_number", "will_visit", "refused"]),
  reason: z.string().optional(),
  // Idempotency key from the offline queue / client (optional, backwards compatible).
  clientRequestId: z.uuid().optional().or(z.literal("")),
});

export async function logContact(patientId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { t } = await getT();
  const raw = Object.fromEntries(formData.entries());
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: t("calls.error.invalid") };
  }
  const clientRequestId = parsed.data.clientRequestId || undefined;

  const cookieStore = await cookies();
  const isDemo = isDemoActive(cookieStore);
  if (isDemo) {
    logDemoContact(patientId, parsed.data.channel, parsed.data.outcome, parsed.data.reason, clientRequestId);
    revalidateContactViews(patientId);
    return { error: null };
  }

  try {
    const [supabase, me] = await Promise.all([createClient(), getCurrentUser()]);

    const { error } = await supabase.from("contact_log").insert({
      patient_id: patientId,
      clinic_id: me.clinicId,
      channel: parsed.data.channel,
      outcome: parsed.data.outcome,
      reason: parsed.data.reason || null,
      created_by: me.userId,
      ...(clientRequestId ? { client_request_id: clientRequestId } : {}),
    });

    // Unique violation on our idempotency key = already applied (lost response).
    if (error && !isDuplicateRequest(error, clientRequestId)) return { error: error.message };

    revalidateContactViews(patientId);
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : t("calls.error.db") };
  }
}

export async function quickLogContact(
  patientId: string,
  channel: "call" | "whatsapp",
  outcome: "reached" | "no_answer" | "wrong_number" | "will_visit" | "refused",
  notes?: string,
  clientRequestId?: string
): Promise<ActionResult> {
  const { t } = await getT();
  if (clientRequestId !== undefined && !z.uuid().safeParse(clientRequestId).success) {
    return { error: t("calls.error.invalidRequest") };
  }
  const cookieStore = await cookies();
  const isDemo = isDemoActive(cookieStore);
  if (isDemo) {
    logDemoContact(patientId, channel, outcome, notes, clientRequestId);
    revalidateContactViews(patientId);
    return { error: null };
  }

  try {
    const [supabase, me] = await Promise.all([createClient(), getCurrentUser()]);

    const { error } = await supabase.from("contact_log").insert({
      patient_id: patientId,
      clinic_id: me.clinicId,
      channel,
      outcome,
      notes: notes || null,
      created_by: me.userId,
      ...(clientRequestId ? { client_request_id: clientRequestId } : {}),
    });

    if (error && !isDuplicateRequest(error, clientRequestId)) return { error: error.message };

    revalidateContactViews(patientId);
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : t("calls.error.db") };
  }
}

const batchContactSchema = (msg: { none: string; tooMany: string; outcome: string }) => z.object({
  patientIds: z
    .array(z.string().min(1))
    .min(1, msg.none)
    .max(100, msg.tooMany),
  outcome: z.enum(["reached", "no_answer", "wrong_number", "will_visit", "refused"], {
    message: msg.outcome,
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
  const { t } = await getT();
  const parsed = batchContactSchema({
    none: t("calls.error.noPatients"),
    tooMany: t("calls.error.tooMany"),
    outcome: t("calls.error.badOutcome"),
  }).safeParse({ patientIds, outcome, notes, channel });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || t("calls.error.batchInvalid"),
      loggedCount: 0,
      skippedCount: 0,
    };
  }

  const valid = parsed.data;
  const [cookieStore, me] = await Promise.all([cookies(), getCurrentUser()]);
  const isDemo = isDemoActive(cookieStore);

  if (isDemo) {
    const demoRes = logDemoBatchContacts(valid.patientIds, valid.outcome, valid.notes);
    revalidatePath("/calls");
    revalidatePath("/today");
    revalidatePath("/patients");
    return demoRes;
  }

  try {
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
    revalidatePath("/patients");
    return { error: null, loggedCount: toInsert.length, skippedCount };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : t("calls.error.db"),
      loggedCount: 0,
      skippedCount: 0,
    };
  }
}

export async function dispatchBotReminder(
  patientId: string,
  patientName: string,
  careEventName: string | undefined,
  reason: "overdue" | "due_soon" | "at_risk" | "lost",
  lang: import("@/lib/whatsapp").SupportedLanguage
): Promise<{ error: string | null; reminderText?: string }> {
  const { t } = await getT();
  const { buildAutomatedReminderMessage } = await import("@/lib/whatsappBot");
  const cookieStore = await cookies();
  const isDemo = isDemoActive(cookieStore);

  const reminderText = buildAutomatedReminderMessage({
    patientId,
    patientName,
    careEventName,
    reason,
    lang,
    clinicName: "MatruSetu Clinic",
  });

  if (isDemo) {
    logDemoContact(patientId, "whatsapp", "reached", `Automated Bot reminder sent (${lang.toUpperCase()}): "${reminderText.slice(0, 100)}..."`);
    revalidatePath("/calls");
    revalidatePath(`/patients/${patientId}`);
    return { error: null, reminderText };
  }

  try {
    const [supabase, me] = await Promise.all([createClient(), getCurrentUser()]);
    const { data: clinic } = await supabase.from("clinics").select("name").eq("id", me.clinicId).single();

    const liveReminderText = buildAutomatedReminderMessage({
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
      notes: `Automated Bot reminder sent (${lang.toUpperCase()}): "${liveReminderText.slice(0, 100)}..."`,
      created_by: me.userId,
    });

    if (error) return { error: error.message };

    revalidatePath("/calls");
    revalidatePath(`/patients/${patientId}`);
    return { error: null, reminderText: liveReminderText };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : t("calls.error.db") };
  }
}

export async function processBotReply(
  patientId: string,
  replyText: string,
  lang: import("@/lib/whatsapp").SupportedLanguage
): Promise<{ error: string | null; result?: import("@/lib/whatsappBot").BotProcessResult }> {
  const { t } = await getT();
  const cookieStore = await cookies();
  const isDemo = isDemoActive(cookieStore);

  if (isDemo) {
    const { detectLanguage } = await import("@/lib/whatsappBot");
    const detectedLang = lang || detectLanguage(replyText, "en");
    const lowered = replyText.trim().toLowerCase();
    const isConfirm = lowered === "1" || lowered === "१" || lowered.includes("confirm") || lowered.includes("yes") || lowered.includes("haan") || lowered.includes("हो") || lowered.includes("आएंगे") || lowered.includes("आऊंगी");
    const isDanger = lowered.includes("headache") || lowered.includes("bleed") || lowered.includes("pain") || lowered.includes("चक्कर") || lowered.includes("दर्द") || lowered.includes("रक्त");
    const reply = isDanger
      ? "⚠️ DANGER SIGN ALERT: Please visit the 24x7 emergency maternity unit or call 108 immediately."
      : isConfirm
      ? "✅ Visit Confirmed: Thank you! Your appointment has been recorded at MatruSetu Clinic."
      : "🏥 MatruSetu Clinic: Thank you for your message. Our staff will follow up shortly.";
    const outcome = isConfirm ? "will_visit" : "reached";
    logDemoContact(patientId, "whatsapp", outcome, `Bot reply (${detectedLang.toUpperCase()}): "${replyText.slice(0, 100)}"`);
    revalidatePath("/calls");
    revalidatePath(`/patients/${patientId}`);
    return {
      error: null,
      result: {
        success: true,
        replyText: reply,
        actionTaken: isConfirm ? "confirmed_visit" : "info_provided",
        patientId,
        patientName: "Patient",
        outcomeLogged: outcome,
      },
    };
  }

  // handleIncomingWhatsAppMessage uses the service-role client, so confirm
  // through the RLS-scoped client that this patient belongs to the caller's clinic.
  const [supabase] = await Promise.all([createClient(), getCurrentUser()]);
  const { data: owned } = await supabase.from("patients").select("id").eq("id", patientId).maybeSingle();
  if (!owned) return { error: t("calls.error.patientNotFound") };

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
