"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isDemoActive } from "@/lib/auth";
import { generateSchedule, type ScheduleTemplateItem } from "@/lib/schedule";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { normalizeIndianPhone } from "@/lib/whatsapp";
import { eddFromLmp } from "@/lib/pregnancy";
import { addDemoPatient, getDemoStore } from "@/lib/demo-data";
import type { CareEventKind } from "@/lib/supabase/enums";
import { parseQuestionnaireForm } from "@/lib/obstetricQuestionnaire";
import { getT } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate-client";

export interface ActionResult {
  error: string | null;
}

function makePatientSchema(t: Translator) {
  return z.object({
  name: z.string().trim().min(2, t("patients.error.name")),
  clinicPatientNo: z.string().trim().max(40).optional(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  age: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.coerce.number().int().positive().max(70).nullable().optional()
  ),
  address: z.string().optional(),
  gravida: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.coerce.number().int().nonnegative().max(20).nullable().optional()
  ),
  para: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.coerce.number().int().nonnegative().max(20).nullable().optional()
  ),
  bloodGroup: z.string().optional(),
  // Unchecked checkboxes are omitted from FormData entirely (not just
  // undefined-valued), so this key must be .optional() to allow that.
  rhNegative: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  lmp: z.iso.date(t("patients.error.lmpInvalid")).refine((val) => {
    const today = toISODate(todayInClinicTimezone());
    return val <= today;
  }, { message: t("patients.error.lmpFuture") }),
  });
}

function escapeSearchPattern(value: string): string {
  return value.replace(/[\\%_*]/g, (character) => "\\" + character);
}

function normalizedName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizedPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return normalizeIndianPhone(phone) ?? phone.replace(/\D/g, "");
}

export async function createPatient(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { t } = await getT();
  const raw = Object.fromEntries(formData.entries());
  const parsed = makePatientSchema(t).safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const input = parsed.data;
  const name = normalizedName(input.name);
  const phone = normalizedPhone(input.phone);
  const matchesRegistration = (patient: { name: string; phone?: string | null }) =>
    Boolean(phone && name === normalizedName(patient.name) && phone === normalizedPhone(patient.phone));

  const cookieStore = await cookies();
  const isDemo = isDemoActive(cookieStore);

  // Parse questionnaire if present
  const parsedQuestionnaire = parseQuestionnaireForm(raw);
  if (parsedQuestionnaire && !parsedQuestionnaire.success) {
    return { error: t("patientDetail.error.invalidInput") };
  }
  const questionnaireData = parsedQuestionnaire?.data;

  if (isDemo) {
    if (getDemoStore().patients.some((patient) => (patient.status ?? "active") === "active" && matchesRegistration(patient))) {
      return { error: t("patients.error.duplicate") };
    }
    const newId = addDemoPatient({
      name: input.name,
      clinicPatientNo: input.clinicPatientNo || null,
      phone: input.phone || null,
      altPhone: input.altPhone || null,
      age: input.age ?? null,
      address: input.address || null,
      gravida: input.gravida ?? null,
      para: input.para ?? null,
      bloodGroup: input.bloodGroup || null,
      rhNegative: input.rhNegative,
      lmp: input.lmp,
      obstetricQuestionnaire: questionnaireData,
    });

    revalidatePath("/(app)", "layout");
    revalidatePath("/patients");
    revalidatePath("/today");
    revalidatePath("/calls");
    redirect(`/patients/${newId}`);
  }

  let createdPatientId: string | null = null;

  try {
    const [supabase, me] = await Promise.all([createClient(), getCurrentUser()]);
    const profile = { clinic_id: me.clinicId };
    if (phone) {
      const pattern = escapeSearchPattern(name).replaceAll(" ", "%");
      const { data: matches, error } = await supabase.from("patients").select("name, phone")
        .eq("clinic_id", me.clinicId).eq("status", "active").ilike("name", `%${pattern}%`);
      if (error) return { error: t("patients.error.dbConnection") };
      if (matches?.some(matchesRegistration)) return { error: t("patients.error.duplicate") };
    }

    const [y, m, d] = input.lmp.split("-").map(Number);
    const lmpDate = new Date(y, m - 1, d);
    const calculatedEdd = toISODate(eddFromLmp(lmpDate));

    const schedule = await buildScheduleRows(supabase, {
      clinicId: profile.clinic_id,
      lmp: input.lmp,
      rhNegative: input.rhNegative,
    });
    if (schedule.error) {
      return { error: schedule.error };
    }

    // Patient + care events are inserted in one DB transaction.
    const { data: patientId, error: insertError } = await supabase.rpc(
      "create_patient_with_schedule",
      {
        p_patient: {
          clinic_id: profile.clinic_id,
          name: input.name,
          clinic_patient_no: input.clinicPatientNo || null,
          phone: input.phone || null,
          alt_phone: input.altPhone || null,
          age: input.age ?? null,
          address: input.address || null,
          gravida: input.gravida ?? null,
          para: input.para ?? null,
          blood_group: input.bloodGroup || null,
          rh_negative: input.rhNegative,
          lmp: input.lmp,
          edd: calculatedEdd,
          edd_source: "lmp",
          created_by: me.userId,
          obstetric_questionnaire: (questionnaireData ?? null) as unknown as import("@/lib/supabase/types").Json,
        },
        p_care_events: schedule.rows,
      }
    );

    if (insertError || !patientId) {
      return { error: insertError?.message ?? t("patients.error.createFailed") };
    }

    createdPatientId = patientId;
  } catch (err: unknown) {
    console.error("createPatient error:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : t("patients.error.dbConnection"),
    };
  }

  if (createdPatientId) {
    revalidatePath("/(app)", "layout");
    revalidatePath("/patients");
    revalidatePath("/today");
    revalidatePath("/calls");
    redirect(`/patients/${createdPatientId}`);
  }

  return { error: t("patients.error.createFailedFinal") };
}

async function buildScheduleRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: { clinicId: string; lmp: string; rhNegative: boolean }
): Promise<{ rows: import("@/lib/supabase/types").Json[]; error: string | null }> {
  const { data: template, error: templateError } = await supabase
    .from("schedule_templates")
    .select("id")
    .eq("clinic_id", params.clinicId)
    .eq("is_default", true)
    .maybeSingle();

  if (templateError) return { rows: [], error: templateError.message };
  if (!template) return { rows: [], error: null };

  const { data: items, error: itemsError } = await supabase
    .from("schedule_template_items")
    .select("id, code, name, kind, window_start_week, window_end_week, condition, is_critical")
    .eq("template_id", template.id);

  if (itemsError) return { rows: [], error: itemsError.message };
  if (!items || items.length === 0) return { rows: [], error: null };

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
    template_item_id: ce.templateItemId,
    name: ce.name,
    kind: ce.kind,
    due_from: toISODate(ce.dueFrom),
    due_to: toISODate(ce.dueTo),
    skipped_reason: ce.skippedReason,
  }));

  return { rows, error: null };
}

export async function resolvePatientCard(raw: string): Promise<string | null> {
  let reference = raw.trim();
  if (!reference || reference.length > 2048) return null;
  const urlMatch = reference.match(/(?:^|https?:\/\/[^/]+)\/patients\/([^/?#]+)/i);
  if (urlMatch) {
    try {
      reference = decodeURIComponent(urlMatch[1]);
    } catch {
      return null;
    }
  } else if (reference.startsWith("{")) {
    try {
      const data: unknown = JSON.parse(reference);
      if (!data || typeof data !== "object" || !("id" in data) || typeof data.id !== "string") return null;
      reference = data.id.trim();
    } catch {
      return null;
    }
  }
  if (!reference || reference.length > 80) return null;

  const me = await getCurrentUser();
  if (me.isDemo) {
    const referenceLower = reference.toLowerCase();
    const patients = getDemoStore().patients;
    const idMatch = patients.find((patient) => patient.id === reference);
    if (idMatch) return idMatch.id;
    const matches = patients.filter((patient) => patient.clinicPatientNo?.toLowerCase() === referenceLower);
    return matches.length === 1 ? matches[0].id : null;
  }

  const supabase = await createClient();
  if (z.uuid().safeParse(reference).success) {
    const { data, error } = await supabase.from("patients").select("id")
      .eq("clinic_id", me.clinicId).eq("id", reference).maybeSingle();
    if (error) throw error;
    if (data) return data.id;
  }
  const exactCard = escapeSearchPattern(reference);
  const { data, error } = await supabase.from("patients").select("id")
    .eq("clinic_id", me.clinicId).ilike("clinic_patient_no", exactCard).limit(2);
  if (error) throw error;
  return data?.length === 1 ? data[0].id : null;
}
