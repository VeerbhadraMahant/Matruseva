"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { eddFromLmp } from "@/lib/pregnancy";
import {
  generateSchedule,
  diffRegeneratedSchedule,
  type ScheduleTemplateItem,
  type ExistingCareEvent,
  type CareEventKind,
} from "@/lib/schedule";

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

const updatePatientSchema = z.object({
  name: z.string().min(2, "Enter the patient's name"),
  clinicPatientNo: z.string().trim().max(40).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  altPhone: z.string().optional().or(z.literal("")),
  age: z.coerce.number().int().positive().max(70).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  gravida: z.coerce.number().int().nonnegative().max(20).optional().or(z.literal("")),
  para: z.coerce.number().int().nonnegative().max(20).optional().or(z.literal("")),
  bloodGroup: z.string().optional().or(z.literal("")),
  rhNegative: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  lmp: z.iso.date("Enter a valid LMP date"),
  edd: z.iso.date().optional().or(z.literal("")),
  eddSource: z.enum(["lmp", "scan", "manual"]).default("lmp"),
});

export async function updatePatient(
  patientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updatePatientSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const input = parsed.data;

  const cookieStore = await cookies();
  const isDemo = cookieStore.get("matrusetu_demo")?.value === "1";
  if (isDemo) {
    revalidatePath(`/patients/${patientId}`);
    revalidatePath("/patients");
    revalidatePath("/today");
    return { error: null };
  }

  const [supabase, me] = await Promise.all([createClient(), getCurrentUser()]);

  // Fetch current patient record to check if LMP or Rh changed
  const { data: currentPatient, error: fetchErr } = await supabase
    .from("patients")
    .select("lmp, edd, rh_negative")
    .eq("id", patientId)
    .single();

  if (fetchErr || !currentPatient) {
    return { error: fetchErr?.message ?? "Patient not found." };
  }

  // Calculate final EDD
  let finalEdd = input.edd || null;
  if (!finalEdd || input.eddSource === "lmp") {
    const [y, m, d] = input.lmp.split("-").map(Number);
    const lmpDate = new Date(y, m - 1, d);
    finalEdd = toISODate(eddFromLmp(lmpDate));
  }

  // Update patient demographics and dating
  const { error: updateErr } = await supabase
    .from("patients")
    .update({
      name: input.name,
      clinic_patient_no: input.clinicPatientNo || null,
      phone: input.phone || null,
      alt_phone: input.altPhone || null,
      age: input.age === "" || input.age === undefined ? null : input.age,
      address: input.address || null,
      gravida: input.gravida === "" || input.gravida === undefined ? null : input.gravida,
      para: input.para === "" || input.para === undefined ? null : input.para,
      blood_group: input.bloodGroup || null,
      rh_negative: input.rhNegative,
      lmp: input.lmp,
      edd: finalEdd,
      edd_source: input.eddSource,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patientId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  // If LMP or Rh Negative status changed, recalculate and diff the care events schedule
  const lmpChanged = currentPatient.lmp !== input.lmp;
  const rhChanged = currentPatient.rh_negative !== input.rhNegative;

  if (lmpChanged || rhChanged) {
    const { data: template } = await supabase
      .from("schedule_templates")
      .select("id")
      .eq("clinic_id", me.clinicId)
      .eq("is_default", true)
      .maybeSingle();

    if (template) {
      const { data: items } = await supabase
        .from("schedule_template_items")
        .select("id, code, name, kind, window_start_week, window_end_week, condition, is_critical")
        .eq("template_id", template.id);

      if (items && items.length > 0) {
        const scheduleItems: ScheduleTemplateItem[] = items.map((i) => ({
          id: i.id,
          code: i.code,
          name: i.name,
          kind: i.kind as CareEventKind,
          windowStartWeek: i.window_start_week,
          windowEndWeek: i.window_end_week,
          condition: i.condition,
          isCritical: i.is_critical,
        }));

        const [y, m, d] = input.lmp.split("-").map(Number);
        const lmpDate = new Date(y, m - 1, d);
        const today = todayInClinicTimezone();

        const regenerated = generateSchedule(
          lmpDate,
          scheduleItems,
          { rhNegative: input.rhNegative },
          today
        );

        // Fetch existing care events for this patient
        const { data: existingCareEvents } = await supabase
          .from("care_events")
          .select("id, template_item_id, completed_at, skipped_reason")
          .eq("patient_id", patientId);

        const existingForDiff: ExistingCareEvent[] = (existingCareEvents ?? [])
          .filter((ce) => ce.template_item_id)
          .map((ce) => ({
            templateItemId: ce.template_item_id!,
            completedAt: ce.completed_at ? new Date(ce.completed_at) : null,
            manuallySkipped: ce.skipped_reason !== null && ce.skipped_reason !== "late_booking",
          }));

        const diff = diffRegeneratedSchedule(regenerated, existingForDiff);

        // Update dates for uncompleted & non-skipped events
        for (const upd of diff.toUpdateDates) {
          await supabase
            .from("care_events")
            .update({
              due_from: toISODate(upd.dueFrom),
              due_to: toISODate(upd.dueTo),
            })
            .eq("patient_id", patientId)
            .eq("template_item_id", upd.templateItemId)
            .is("completed_at", null)
            .is("skipped_reason", null);
        }

        // Insert newly applicable items (e.g. anti_d if changed to Rh-)
        if (diff.toInsert.length > 0) {
          const rowsToInsert = diff.toInsert.map((e) => ({
            clinic_id: me.clinicId,
            patient_id: patientId,
            template_item_id: e.templateItemId,
            name: e.name,
            kind: e.kind,
            due_from: toISODate(e.dueFrom),
            due_to: toISODate(e.dueTo),
            skipped_reason: e.skippedReason,
          }));
          await supabase.from("care_events").insert(rowsToInsert);
        }
      }
    }
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");
  revalidatePath("/today");
  return { error: null };
}
