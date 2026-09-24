"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { todayInClinicTimezone, toISODate } from "@/lib/today";

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: patient } = await supabase.from("patients").select("clinic_id").eq("id", patientId).single();
  if (!patient) return { error: "Patient not found." };

  const { error } = await supabase.from("visits").insert({
    patient_id: patientId,
    clinic_id: patient.clinic_id,
    visit_date: v.visitDate || toISODate(todayInClinicTimezone()),
    bp_sys: num(v.bpSys),
    bp_dia: num(v.bpDia),
    weight: num(v.weight),
    hb: num(v.hb),
    fhr: num(v.fhr),
    fundal_height: num(v.fundalHeight),
    notes: v.notes || null,
    next_visit_date: v.nextVisitDate || null,
    created_by: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/patients/${patientId}`);
  return { error: null };
}
