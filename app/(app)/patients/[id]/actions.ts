"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { closeDemoPregnancy } from "@/lib/demo-data";

export interface ActionResult {
  error: string | null;
}

export async function markCareEventDone(careEventId: string, patientId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("care_events")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", careEventId);

  if (error) return { error: error.message };

  revalidatePath(`/patients/${patientId}`);
  return { error: null };
}

const visitSchema = z.object({
  visitDate: z.iso.date().optional().or(z.literal("")),
  bpSys: z.coerce.number().int().positive().optional().or(z.literal("")),
  bpDia: z.coerce.number().int().positive().optional().or(z.literal("")),
  weight: z.coerce.number().positive().optional().or(z.literal("")),
  hb: z.coerce.number().positive().optional().or(z.literal("")),
  fhr: z.coerce.number().int().positive().optional().or(z.literal("")),
  fundalHeight: z.coerce.number().positive().optional().or(z.literal("")),
  notes: z.string().optional(),
  nextVisitDate: z.iso.date().optional().or(z.literal("")),
});

export async function recordVisit(
  patientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = visitSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;
  const num = (x: number | "" | undefined) => (x === "" || x === undefined ? null : x);

  const [supabase, me] = await Promise.all([createClient(), getCurrentUser()]);

  const { error } = await supabase.from("visits").insert({
    patient_id: patientId,
    clinic_id: me.clinicId,
    visit_date: v.visitDate || toISODate(todayInClinicTimezone()),
    bp_sys: num(v.bpSys),
    bp_dia: num(v.bpDia),
    weight: num(v.weight),
    hb: num(v.hb),
    fhr: num(v.fhr),
    fundal_height: num(v.fundalHeight),
    notes: v.notes || null,
    next_visit_date: v.nextVisitDate || null,
    created_by: me.userId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/patients/${patientId}`);
  return { error: null };
}

const closePregnancySchema = z.object({
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid delivery date (YYYY-MM-DD) is required"),
  deliveryMode: z.enum(["NVD", "LSCS"], { message: "Delivery mode must be NVD or LSCS" }),
  birthWeightKg: z.coerce
    .number({ message: "Birth weight must be a valid number" })
    .min(0.5, "Birth weight must be at least 0.5 kg")
    .max(6.5, "Birth weight cannot exceed 6.5 kg"),
  notes: z.string().optional(),
});

export type ClosePregnancyInput = z.infer<typeof closePregnancySchema>;

export async function closePregnancy(
  patientId: string,
  input: ClosePregnancyInput
): Promise<ActionResult> {
  const parsed = closePregnancySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input data" };
  }

  const data = parsed.data;
  const today = todayInClinicTimezone();
  const todayIso = toISODate(today);

  if (data.deliveryDate > todayIso) {
    return { error: "Delivery date cannot be in the future." };
  }

  const [cookieStore, me] = await Promise.all([cookies(), getCurrentUser()]);
  const isDemo = cookieStore.get("matrusetu_demo")?.value === "1";

  if (isDemo) {
    const demoRes = closeDemoPregnancy(patientId, data, me.fullName);
    if (demoRes.error) return demoRes;

    revalidatePath(`/patients/${patientId}`);
    revalidatePath("/today");
    revalidatePath("/calls");
    revalidatePath("/patients");
    return { error: null };
  }

  const supabase = await createClient();

  // Verify patient exists and is currently active
  const { data: patient, error: fetchError } = await supabase
    .from("patients")
    .select("id, status, pregnancy_status, lmp, created_at")
    .eq("id", patientId)
    .maybeSingle();

  if (fetchError || !patient) {
    return { error: fetchError?.message || "Patient not found." };
  }

  // Idempotent rejection: reject if already closed
  if (
    patient.status === "delivered" ||
    patient.status === "closed" ||
    patient.pregnancy_status === "delivered" ||
    patient.pregnancy_status === "closed"
  ) {
    return { error: "This pregnancy has already been closed." };
  }

  // Check delivery date does not precede LMP
  if (patient.lmp && data.deliveryDate < patient.lmp) {
    return { error: `Delivery date cannot be before the Last Menstrual Period date (${patient.lmp}).` };
  }

  const nowIso = new Date().toISOString();

  // Single transaction update on patients table
  const { error: updateError } = await supabase
    .from("patients")
    .update({
      status: "delivered",
      pregnancy_status: "delivered",
      delivery_date: data.deliveryDate,
      delivery_mode: data.deliveryMode,
      birth_weight_kg: data.birthWeightKg,
      closed_at: nowIso,
      closed_by: me.userId,
    })
    .eq("id", patientId);

  if (updateError) return { error: updateError.message };

  // Close active/open ANC care events so they no longer trigger overdue/due alerts
  await supabase
    .from("care_events")
    .update({ skipped_reason: "Pregnancy closed / delivered" })
    .eq("patient_id", patientId)
    .is("completed_at", null)
    .is("skipped_reason", null);

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/today");
  revalidatePath("/calls");
  revalidatePath("/patients");
  return { error: null };
}

