"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { NewbornSex } from "@/lib/supabase/enums";
import { getCurrentUser } from "@/lib/auth";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { getDemoPostnatalData, recordDemoPostnatalVisit, setDemoBirthVaccine, updateDemoNewborn } from "@/lib/demo-data";
import { getT } from "@/lib/i18n/server";
import {
  BIRTH_VACCINES,
  POSTNATAL_VISITS,
  babyFindingsSchema,
  motherFindingsSchema,
  type BirthVaccineCode,
  type PostnatalVisitCode,
} from "@/lib/postnatal";
import type { ActionResult } from "./actions";

function revalidatePostnatalViews(patientId: string) {
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/today");
  revalidatePath(`/patients/${patientId}/postnatal-summary`);
}

/** This patient's babies (id + birth date); RLS scopes the real query to the caller's clinic. */
async function loadNewborns(patientId: string, isDemo: boolean): Promise<{ id: string; birth_date: string }[]> {
  if (isDemo) return getDemoPostnatalData(patientId).newborns;
  if (!z.uuid().safeParse(patientId).success) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("newborns").select("id, birth_date").eq("patient_id", patientId);
  if (error) throw error;
  return data ?? [];
}

/** One scheduled visit (window start and completion), or null when the mother has no such visit. */
async function loadVisit(
  patientId: string,
  code: PostnatalVisitCode,
  isDemo: boolean,
): Promise<{ due_from: string; completed_at: string | null } | null> {
  if (isDemo) return getDemoPostnatalData(patientId).visits.find((v) => v.code === code) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("postnatal_visits")
    .select("due_from, completed_at")
    .eq("patient_id", patientId)
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Completes (or re-saves) one joint postnatal visit: mother findings plus per-baby findings keyed by newborn id.
 * A visit cannot be recorded before its window opens; re-saving keeps the original completed_at / completed_by.
 */
export async function recordPostnatalVisit(
  patientId: string,
  code: PostnatalVisitCode,
  input: { mother: unknown; babies: Record<string, unknown>; notes?: string },
): Promise<ActionResult> {
  const { t } = await getT();
  const mother = motherFindingsSchema.safeParse(input?.mother);
  const babies = z.record(z.string(), babyFindingsSchema).safeParse(input?.babies);
  const notes = z.string().trim().max(2000).optional().safeParse(input?.notes);
  if (!POSTNATAL_VISITS.some((v) => v.code === code) || !mother.success || !babies.success || !notes.success) {
    return { error: t("postnatal.error.invalidInput") };
  }

  const me = await getCurrentUser(); // redirects when signed out, so it stays outside the try
  try {
    const isDemo = !!me.isDemo;
    const known = new Set((await loadNewborns(patientId, isDemo)).map((n) => n.id));
    if (known.size === 0) return { error: t("postnatal.error.notFound") };
    if (Object.keys(babies.data).some((id) => !known.has(id))) return { error: t("postnatal.error.unknownBaby") };

    const visit = await loadVisit(patientId, code, isDemo);
    if (!visit) return { error: t("postnatal.error.notFound") };
    if (toISODate(todayInClinicTimezone()) < visit.due_from) return { error: t("postnatal.error.visitNotYetDue") };

    if (isDemo) {
      const ok = recordDemoPostnatalVisit(patientId, code, {
        mother: mother.data, babies: babies.data, notes: notes.data || null, completedBy: me.userId,
      });
      if (!ok) return { error: t("postnatal.error.notFound") };
    } else {
      const supabase = await createClient();
      const { data, error } = await supabase.from("postnatal_visits")
        .update({
          ...(!visit.completed_at && { completed_at: new Date().toISOString(), completed_by: me.userId }),
          mother_findings: mother.data as unknown as Json,
          baby_findings: babies.data as unknown as Json,
          notes: notes.data || null,
        })
        .eq("patient_id", patientId)
        .eq("code", code)
        .eq("clinic_id", me.clinicId)
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("postnatal-actions: write failed", error);
        return { error: t("common.error.generic") };
      }
      if (!data) return { error: t("postnatal.error.notFound") };
    }

    revalidatePostnatalViews(patientId);
    return { error: null };
  } catch (err) {
    console.error("postnatal-actions: unexpected failure", err);
    return { error: t("postnatal.error.dbConnection") };
  }
}

/** Marks a birth-dose vaccine given (on a date, optional batch), given elsewhere, or back to pending. */
export async function setBirthVaccine(
  patientId: string,
  newbornId: string,
  vaccine: BirthVaccineCode,
  input: { status: "given" | "given_elsewhere" | "pending"; givenOn?: string; batchNo?: string },
): Promise<ActionResult> {
  const { t } = await getT();
  const parsed = z.object({
    vaccine: z.enum(BIRTH_VACCINES.map((v) => v.code) as [BirthVaccineCode, ...BirthVaccineCode[]]),
    status: z.enum(["given", "given_elsewhere", "pending"]),
    batchNo: z.string().trim().max(40).optional(),
  }).safeParse({ vaccine, status: input?.status, batchNo: input?.batchNo });
  if (!parsed.success) return { error: t("postnatal.error.invalidInput") };
  const { status } = parsed.data;

  const todayIso = toISODate(todayInClinicTimezone());
  const givenOn = status === "given" ? input.givenOn || todayIso : null;
  if (givenOn !== null && !z.iso.date().safeParse(givenOn).success) {
    return { error: t("postnatal.error.vaccineDateInvalid") };
  }
  if (givenOn !== null && givenOn > todayIso) return { error: t("postnatal.error.vaccineDateFuture") };

  const me = await getCurrentUser();
  try {
    const isDemo = !!me.isDemo;
    const baby =(await loadNewborns(patientId, isDemo)).find((n) => n.id === newbornId);
    if (!baby) return { error: t("postnatal.error.unknownBaby") };
    if (givenOn !== null && givenOn < baby.birth_date) return { error: t("postnatal.error.vaccineBeforeBirth") };

    const row = {
      given_on: givenOn,
      given_elsewhere: status === "given_elsewhere",
      batch_no: status === "given" ? parsed.data.batchNo || null : null,
    };
    if (isDemo) {
      if (!setDemoBirthVaccine(newbornId, vaccine, row)) return { error: t("postnatal.error.notFound") };
    } else {
      const supabase = await createClient();
      const { data, error } = await supabase.from("newborn_vaccinations")
        .update({ ...row, recorded_by: status === "pending" ? null : me.userId })
        .eq("newborn_id", newbornId)
        .eq("vaccine", vaccine)
        .eq("patient_id", patientId)
        .eq("clinic_id", me.clinicId)
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("postnatal-actions: write failed", error);
        return { error: t("common.error.generic") };
      }
      if (!data) return { error: t("postnatal.error.notFound") };
    }

    revalidatePostnatalViews(patientId);
    return { error: null };
  } catch (err) {
    console.error("postnatal-actions: unexpected failure", err);
    return { error: t("postnatal.error.dbConnection") };
  }
}

/** Sets or clears a baby's name and sex; only the fields present in `input` change ("" clears). */
export async function updateNewborn(
  patientId: string,
  newbornId: string,
  input: { name?: string; sex?: NewbornSex | "" },
): Promise<ActionResult> {
  const { t } = await getT();
  const parsed = z.object({
    name: z.string().trim().max(120).optional(),
    sex: z.enum(["female", "male", "ambiguous", ""]).optional(),
  }).safeParse(input);
  if (!parsed.success) return { error: t("postnatal.error.invalidInput") };
  const patch = {
    ...(parsed.data.name !== undefined && { name: parsed.data.name || null }),
    ...(parsed.data.sex !== undefined && { sex: parsed.data.sex || null }),
  };

  const me = await getCurrentUser();
  try {
    const isDemo = !!me.isDemo;
    if (!(await loadNewborns(patientId, isDemo)).some((n) => n.id === newbornId)) {
      return { error: t("postnatal.error.unknownBaby") };
    }
    if (isDemo) {
      if (!updateDemoNewborn(newbornId, patch)) return { error: t("postnatal.error.notFound") };
    } else if (Object.keys(patch).length > 0) {
      const supabase = await createClient();
      const { error } = await supabase.from("newborns").update(patch).eq("id", newbornId).eq("patient_id", patientId);
      if (error) {
        console.error("postnatal-actions: write failed", error);
        return { error: t("common.error.generic") };
      }
    }

    revalidatePostnatalViews(patientId);
    return { error: null };
  } catch (err) {
    console.error("postnatal-actions: unexpected failure", err);
    return { error: t("postnatal.error.dbConnection") };
  }
}
