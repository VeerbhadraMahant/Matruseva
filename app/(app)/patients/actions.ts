"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateSchedule, type ScheduleTemplateItem } from "@/lib/schedule";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import type { CareEventKind } from "@/lib/supabase/enums";

export interface ActionResult {
  error: string | null;
}

const patientSchema = z.object({
  name: z.string().min(2, "Enter the patient's name"),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  age: z.coerce.number().int().positive().max(70).optional().or(z.literal("")),
  address: z.string().optional(),
  gravida: z.coerce.number().int().nonnegative().max(20).optional().or(z.literal("")),
  para: z.coerce.number().int().nonnegative().max(20).optional().or(z.literal("")),
  bloodGroup: z.string().optional(),
  // Unchecked checkboxes are omitted from FormData entirely (not just
  // undefined-valued), so this key must be .optional() to allow that.
  rhNegative: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  lmp: z.iso.date("Enter a valid LMP date"),
});

export async function createPatient(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session expired. Please log in again." };
  }

  const { data: profile } = await supabase.from("profiles").select("clinic_id").eq("id", user.id).single();
  if (!profile) {
    return { error: "No clinic found for your account." };
  }

  const { data: patient, error: insertError } = await supabase
    .from("patients")
    .insert({
      clinic_id: profile.clinic_id,
      name: input.name,
      phone: input.phone || null,
      alt_phone: input.altPhone || null,
      age: input.age === "" || input.age === undefined ? null : input.age,
      address: input.address || null,
      gravida: input.gravida === "" || input.gravida === undefined ? null : input.gravida,
      para: input.para === "" || input.para === undefined ? null : input.para,
      blood_group: input.bloodGroup || null,
      rh_negative: input.rhNegative,
      lmp: input.lmp,
      edd_source: "lmp",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !patient) {
    return { error: insertError?.message ?? "Could not create patient." };
  }

  await generateScheduleForPatient(supabase, {
    clinicId: profile.clinic_id,
    patientId: patient.id,
    lmp: input.lmp,
    rhNegative: input.rhNegative,
  });

  redirect(`/patients/${patient.id}`);
}

async function generateScheduleForPatient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: { clinicId: string; patientId: string; lmp: string; rhNegative: boolean }
) {
  const { data: template } = await supabase
    .from("schedule_templates")
    .select("id")
    .eq("clinic_id", params.clinicId)
    .eq("is_default", true)
    .maybeSingle();

  if (!template) return;

  const { data: items } = await supabase
    .from("schedule_template_items")
    .select("id, code, name, kind, window_start_week, window_end_week, condition, is_critical")
    .eq("template_id", template.id);

  if (!items || items.length === 0) return;

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

  // lmp is a "YYYY-MM-DD" date-only string; parse as a local calendar date
  // (not UTC) to match lib/pregnancy.ts and lib/today.ts's local-getter convention.
  const [y, m, d] = params.lmp.split("-").map(Number);
  const lmpDate = new Date(y, m - 1, d);
  const today = todayInClinicTimezone();

  const generated = generateSchedule(lmpDate, scheduleItems, { rhNegative: params.rhNegative }, today);

  const careEventRows = generated.map((e) => ({
    clinic_id: params.clinicId,
    patient_id: params.patientId,
    template_item_id: e.templateItemId,
    name: e.name,
    kind: e.kind,
    due_from: toISODate(e.dueFrom),
    due_to: toISODate(e.dueTo),
    skipped_reason: e.skippedReason,
  }));

  await supabase.from("care_events").insert(careEventRows);
}
