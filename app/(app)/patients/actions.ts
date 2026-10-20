"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { generateSchedule, type ScheduleTemplateItem } from "@/lib/schedule";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { addDemoPatient } from "@/lib/demo-data";
import type { CareEventKind } from "@/lib/supabase/enums";

export interface ActionResult {
  error: string | null;
}

const patientSchema = z.object({
  name: z.string().min(2, "Enter the patient's name"),
  clinicPatientNo: z.string().trim().max(40).optional(),
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

  const cookieStore = await cookies();
  const isDemo = cookieStore.get("matrusetu_demo")?.value === "1";

  if (isDemo) {
    const newId = addDemoPatient({
      name: input.name,
      clinicPatientNo: input.clinicPatientNo || null,
      phone: input.phone || null,
      altPhone: input.altPhone || null,
      age: input.age === "" || input.age === undefined ? null : input.age,
      address: input.address || null,
      gravida: input.gravida === "" || input.gravida === undefined ? null : input.gravida,
      para: input.para === "" || input.para === undefined ? null : input.para,
      bloodGroup: input.bloodGroup || null,
      rhNegative: input.rhNegative,
      lmp: input.lmp,
    });
    redirect(`/patients/${newId}`);
  }

  try {
    const [supabase, me] = await Promise.all([createClient(), getCurrentUser()]);
    const profile = { clinic_id: me.clinicId };

    const { data: patient, error: insertError } = await supabase
      .from("patients")
      .insert({
        clinic_id: profile.clinic_id,
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
        edd_source: "lmp",
        created_by: me.userId,
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
  } catch (err: unknown) {
    // Next.js redirect() throws a NEXT_REDIRECT error which must be rethrown!
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("createPatient error:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Database connection failed. Please check your Supabase configuration.",
    };
  }
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

  const [y, m, d] = params.lmp.split("-").map(Number);
  const lmpDate = new Date(y, m - 1, d);
  const today = todayInClinicTimezone();

  const careEvents = generateSchedule(
    lmpDate,
    scheduleItems,
    { rhNegative: params.rhNegative },
    today
  );

  const rows = careEvents.map((ce) => ({
    clinic_id: params.clinicId,
    patient_id: params.patientId,
    template_item_id: ce.templateItemId,
    name: ce.name,
    kind: ce.kind,
    due_from: toISODate(ce.dueFrom),
    due_to: toISODate(ce.dueTo),
    skipped_reason: ce.skippedReason,
  }));

  await supabase.from("care_events").insert(rows);
}
