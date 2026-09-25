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
