/**
 * Postnatal care (mother + newborn, first 42 days): schedule, statuses and
 * risk flags. Pure and unit tested; the contract lives in docs/POSTNATAL.md.
 * Dates are ISO "YYYY-MM-DD" calendar days (IST), never timestamps.
 */

import { z } from "zod";
import { daysBetween, parseLocalDate } from "@/lib/format";
import { addDays } from "@/lib/pregnancy";
import { toISODate } from "@/lib/today";

export const POSTNATAL_VISITS = [
  { code: "PNC_D3", day: 3, fromDay: 2, toDay: 4 },
  { code: "PNC_D7", day: 7, fromDay: 6, toDay: 9 },
  { code: "PNC_D14", day: 14, fromDay: 13, toDay: 17 },
  { code: "PNC_D42", day: 42, fromDay: 40, toDay: 49 },
] as const;

export type PostnatalVisitCode = (typeof POSTNATAL_VISITS)[number]["code"];

export const BIRTH_VACCINES = [
  { code: "HEPB0", overdueAfterDay: 1 },
  { code: "OPV0", overdueAfterDay: 15 },
  { code: "BCG", overdueAfterDay: 42 },
] as const;

export type BirthVaccineCode = (typeof BIRTH_VACCINES)[number]["code"];

export const DANGER_SIGNS = [
  "not_feeding",
  "convulsions",
  "fast_breathing",
  "chest_indrawing",
  "fever",
  "low_temperature",
  "lethargy",
  "jaundice_palms_soles",
  "cord_infection",
] as const;
export type DangerSign = (typeof DANGER_SIGNS)[number];

export const FEEDING = ["exclusive_breast", "mixed", "formula", "poor"] as const;
export type Feeding = (typeof FEEDING)[number];

export const FP_METHODS = ["none", "lam", "condom", "pills", "iud", "injectable", "sterilisation"] as const;
export type FpMethod = (typeof FP_METHODS)[number];

// --- Dates -----------------------------------------------------------------

const shift = (iso: string, days: number) => toISODate(addDays(parseLocalDate(iso), days));

export function buildPostnatalVisits(deliveryIso: string) {
  return POSTNATAL_VISITS.map((v) => ({
    code: v.code,
    due_from: shift(deliveryIso, v.fromDay),
    due_to: shift(deliveryIso, v.toDay),
  }));
}

export function dayOfLife(birthIso: string, todayIso: string): number {
  return daysBetween(parseLocalDate(birthIso), parseLocalDate(todayIso));
}

export function gestationalWeeksAtBirth(lmpIso: string, deliveryIso: string): number {
  return Math.floor(dayOfLife(lmpIso, deliveryIso) / 7);
}

// --- Statuses (ISO date strings compare correctly as text) -------------------

export function postnatalVisitStatus(
  v: { due_from: string; due_to: string; completed_at: string | null },
  todayIso: string,
): "done" | "due" | "overdue" | "upcoming" {
  if (v.completed_at) return "done";
  if (todayIso > v.due_to) return "overdue";
  if (todayIso < v.due_from) return "upcoming";
  return "due";
}

export type PostnatalVisitState = ReturnType<typeof postnatalVisitStatus> | "missed";

/**
 * Status of every visit in one schedule (result is parallel to `visits`). An incomplete visit is
 * "missed", not overdue, once a later visit in schedule order is completed or its window has opened.
 */
export function postnatalVisitStatuses(
  visits: { code: PostnatalVisitCode; due_from: string; due_to: string; completed_at: string | null }[],
  todayIso: string,
): PostnatalVisitState[] {
  const rank = (code: PostnatalVisitCode) => POSTNATAL_VISITS.findIndex((v) => v.code === code);
  return visits.map((v) => {
    const status = postnatalVisitStatus(v, todayIso);
    if (status === "done") return status;
    const superseded = visits.some((l) => rank(l.code) > rank(v.code) && (l.completed_at || l.due_from <= todayIso));
    return superseded ? "missed" : status;
  });
}

export function birthVaccineStatus(
  v: { vaccine: BirthVaccineCode; given_on: string | null; given_elsewhere: boolean },
  birthIso: string,
  todayIso: string,
): "given" | "due" | "overdue" {
  if (v.given_on || v.given_elsewhere) return "given";
  const { overdueAfterDay } = BIRTH_VACCINES.find((b) => b.code === v.vaccine)!;
  return dayOfLife(birthIso, todayIso) > overdueAfterDay ? "overdue" : "due";
}

// --- Schemas -----------------------------------------------------------------

// Forms send "" for empty fields: treat "" and null as absent, otherwise coerce numeric strings.
const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optNumber = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().min(min).max(max).optional());
const optEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(blankToUndefined, z.enum(values).optional());

export const newbornInputSchema = z.object({
  name: z.preprocess(blankToUndefined, z.string().trim().max(120).optional()),
  sex: optEnum(["female", "male", "ambiguous"] as const),
  birth_weight_kg: z.coerce.number().min(0.5).max(6.5),
  nicu_admission: z.boolean().default(false),
});
export type NewbornInput = z.infer<typeof newbornInputSchema>;

export const motherFindingsSchema = z.object({
  bp_systolic: optNumber(60, 250),
  bp_diastolic: optNumber(30, 160),
  temperature_c: optNumber(34, 43),
  heavy_bleeding: z.boolean().default(false),
  wound_problem: z.boolean().default(false),
  breast_problem: z.boolean().default(false),
  low_mood: z.boolean().default(false),
  loss_of_interest: z.boolean().default(false),
  fp_method: optEnum(FP_METHODS),
});
export type MotherFindings = z.infer<typeof motherFindingsSchema>;

export const babyFindingsSchema = z.object({
  weight_kg: optNumber(0.5, 8),
  feeding: optEnum(FEEDING),
  danger_signs: z.array(z.enum(DANGER_SIGNS)).default([]),
});
export type BabyFindings = z.infer<typeof babyFindingsSchema>;

// --- Risk flags ----------------------------------------------------------------

type VisitRow = { code: PostnatalVisitCode; completed_at: string | null };

/** Completed visits that pass `keep`, in schedule order (latest last). */
function completedInOrder<V extends VisitRow>(visits: V[], keep: (v: V) => boolean): V[] {
  const rank = (code: PostnatalVisitCode) => POSTNATAL_VISITS.findIndex((v) => v.code === code);
  return visits.filter((v) => v.completed_at && keep(v)).sort((a, b) => rank(a.code) - rank(b.code));
}

export function latestMotherFindings(
  visits: (VisitRow & { mother_findings: MotherFindings | null })[],
): MotherFindings | null {
  return completedInOrder(visits, (v) => !!v.mother_findings).at(-1)?.mother_findings ?? null;
}

export type NewbornFlag =
  | "vlbw"
  | "lbw"
  | "very_preterm"
  | "preterm"
  | "nicu"
  | "danger_sign"
  | "poor_feeding"
  | "weight_not_regained";

export function newbornFlags(
  newborn: {
    id: string;
    birth_weight_kg: number;
    gestational_age_weeks: number | null;
    nicu_admission: boolean;
  },
  visits: (VisitRow & { baby_findings: Record<string, BabyFindings> | null })[],
): NewbornFlag[] {
  const flags: NewbornFlag[] = [];
  const { birth_weight_kg: bw, gestational_age_weeks: ga } = newborn;

  if (bw < 1.5) flags.push("vlbw");
  else if (bw < 2.5) flags.push("lbw");
  if (ga != null) {
    if (ga < 32) flags.push("very_preterm");
    else if (ga < 37) flags.push("preterm");
  }
  if (newborn.nicu_admission) flags.push("nicu");

  const own = completedInOrder(visits, (v) => !!v.baby_findings?.[newborn.id]).map((v) => ({
    code: v.code,
    f: v.baby_findings![newborn.id],
  }));
  const latest = own.at(-1)?.f;
  if (latest?.danger_signs?.length) flags.push("danger_sign");
  if (latest?.feeding === "poor") flags.push("poor_feeding");

  // Judge on the most recent weighing at the day-14 or day-42 check.
  const weighed = own.filter((v) => (v.code === "PNC_D14" || v.code === "PNC_D42") && v.f.weight_kg != null);
  const weight = weighed.at(-1)?.f.weight_kg;
  if (weight != null && weight < bw) flags.push("weight_not_regained");

  return flags;
}

export type MotherFlag = "high_bp" | "heavy_bleeding" | "fever" | "low_mood" | "wound_problem" | "breast_problem";

export function motherFlags(f: MotherFindings | null): MotherFlag[] {
  if (!f) return [];
  const flags: MotherFlag[] = [];
  if ((f.bp_systolic ?? 0) >= 140 || (f.bp_diastolic ?? 0) >= 90) flags.push("high_bp");
  if (f.heavy_bleeding) flags.push("heavy_bleeding");
  if ((f.temperature_c ?? 0) >= 38) flags.push("fever");
  if (f.low_mood || f.loss_of_interest) flags.push("low_mood");
  if (f.wound_problem) flags.push("wound_problem");
  if (f.breast_problem) flags.push("breast_problem");
  return flags;
}

export const URGENT_FLAGS: ReadonlySet<NewbornFlag | MotherFlag> = new Set<NewbornFlag | MotherFlag>([
  "danger_sign",
  "heavy_bleeding",
  "high_bp",
]);
