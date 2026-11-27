import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isDemoActive } from "@/lib/auth";
import {
  getDemoPostnatalData,
  type DemoNewborn,
  type DemoNewbornVaccine,
  type DemoPostnatalVisit,
} from "@/lib/demo-data";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { addDays } from "@/lib/pregnancy";
import { parseLocalDate } from "@/lib/format";
import {
  POSTNATAL_VISITS,
  URGENT_FLAGS,
  birthVaccineStatus,
  dayOfLife,
  latestMotherFindings,
  motherFlags,
  newbornFlags,
  postnatalVisitStatus,
  type MotherFlag,
  type NewbornFlag,
} from "@/lib/postnatal";

export type NewbornView = DemoNewborn & { flags: NewbornFlag[]; dayOfLife: number };
export type PostnatalVisitView = DemoPostnatalVisit & { status: ReturnType<typeof postnatalVisitStatus> };
export type VaccineView = DemoNewbornVaccine & { status: ReturnType<typeof birthVaccineStatus> };

export interface PatientPostnatal {
  deliveryDate: string;
  deliveryMode: "NVD" | "LSCS" | null;
  newborns: NewbornView[];
  visits: PostnatalVisitView[];
  vaccines: VaccineView[];
  motherFlags: MotherFlag[];
  urgent: boolean;
  todayIso: string;
}

export interface PostnatalDueRow {
  patientId: string;
  name: string;
  clinicPatientNo: string | null;
  deliveryDate: string;
  dayOfLife: number;
  nextVisit: PostnatalVisitView | null;
  pendingVaccines: number;
  overdueVaccines: number;
  urgent: boolean;
  flags: (NewbornFlag | MotherFlag)[];
}

/** Postnatal follow-up runs 6 weeks; the last visit window closes on day 49. */
const POSTNATAL_DAYS = 49;

interface Raw {
  patients: { id: string; name: string; clinic_patient_no: string | null; delivery_date: string; delivery_mode: "NVD" | "LSCS" | null }[];
  newborns: DemoNewborn[];
  visits: DemoPostnatalVisit[];
  vaccines: DemoNewbornVaccine[];
}

const visitRank = (code: string) => POSTNATAL_VISITS.findIndex((v) => v.code === code);

/** One mother's postnatal picture from raw rows; null when she has no babies recorded. */
function buildPostnatal(
  p: Raw["patients"][number],
  raw: Pick<Raw, "newborns" | "visits" | "vaccines">,
  todayIso: string,
): PatientPostnatal | null {
  const babies = raw.newborns.filter((n) => n.patient_id === p.id).sort((a, b) => a.birth_order - b.birth_order);
  if (babies.length === 0) return null;
  const birthBy = new Map(babies.map((n) => [n.id, n.birth_date]));

  const visits = raw.visits
    .filter((v) => v.patient_id === p.id)
    .sort((a, b) => visitRank(a.code) - visitRank(b.code))
    .map((v): PostnatalVisitView => ({
      ...v,
      // The column defaults to '{}' until the visit is completed.
      mother_findings: v.mother_findings && Object.keys(v.mother_findings).length > 0 ? v.mother_findings : null,
      baby_findings: v.baby_findings ?? {},
      status: postnatalVisitStatus(v, todayIso),
    }));
  const vaccines = raw.vaccines
    .filter((v) => birthBy.has(v.newborn_id))
    .map((v): VaccineView => ({ ...v, status: birthVaccineStatus(v, birthBy.get(v.newborn_id)!, todayIso) }));
  const newborns = babies.map((n): NewbornView => ({
    ...n,
    flags: newbornFlags(n, visits),
    dayOfLife: dayOfLife(n.birth_date, todayIso),
  }));

  const mother = motherFlags(latestMotherFindings(visits));
  const urgent = [...mother, ...newborns.flatMap((n) => n.flags)].some((f) => URGENT_FLAGS.has(f));
  return { deliveryDate: p.delivery_date, deliveryMode: p.delivery_mode, newborns, visits, vaccines, motherFlags: mother, urgent, todayIso };
}

type Scope = { patientId: string } | { since: string };

async function loadRaw(scope: Scope): Promise<Raw> {
  const supabase = await createClient();
  const patients = supabase.from("patients").select("id, name, clinic_patient_no, delivery_date, delivery_mode");
  const newborns = supabase.from("newborns").select("*, newborn_vaccinations(*)");
  const visits = supabase.from("postnatal_visits").select("*");
  // RLS scopes every query to the caller's clinic. Visits are matched by due_to: a mother delivered
  // since `since` always has a window closing after it.
  const one = "patientId" in scope;
  const [p, n, v] = await Promise.all([
    one ? patients.eq("id", scope.patientId) : patients.eq("status", "delivered").gte("delivery_date", scope.since),
    one ? newborns.eq("patient_id", scope.patientId) : newborns.gte("birth_date", scope.since),
    one ? visits.eq("patient_id", scope.patientId) : visits.gte("due_to", scope.since),
  ]);
  const error = p.error ?? n.error ?? v.error;
  if (error) throw error;

  type VaccineRow = Omit<DemoNewbornVaccine, "vaccine"> & { vaccine: string };
  const nbRows = (n.data ?? []) as unknown as (DemoNewborn & { newborn_vaccinations: VaccineRow[] })[];
  return {
    patients: (p.data ?? []).flatMap((r) =>
      r.delivery_date ? [{ ...r, delivery_date: r.delivery_date, delivery_mode: r.delivery_mode as "NVD" | "LSCS" | null }] : []),
    newborns: nbRows.map((r) => {
      const row: Partial<typeof r> = { ...r };
      delete row.newborn_vaccinations;
      return row as DemoNewborn;
    }),
    visits: (v.data ?? []) as unknown as DemoPostnatalVisit[],
    vaccines: nbRows.flatMap((r) => r.newborn_vaccinations) as DemoNewbornVaccine[],
  };
}

export const getPatientPostnatal = cache(async (patientId: string): Promise<PatientPostnatal | null> => {
  const todayIso = toISODate(todayInClinicTimezone());
  const isDemo = isDemoActive(await cookies());
  const raw: Raw = isDemo ? getDemoPostnatalData(patientId) : await loadRaw({ patientId });
  const patient = raw.patients[0];
  return patient ? buildPostnatal(patient, raw, todayIso) : null;
});

/**
 * Mothers delivered in the last 49 days who need attention: a visit due or overdue (or due within
 * 7 days), a birth vaccine still to give, or an urgent flag. Three queries, no per-patient fetches.
 */
export const getClinicPostnatalDue = cache(async (): Promise<PostnatalDueRow[]> => {
  const todayIso = toISODate(todayInClinicTimezone());
  const since = toISODate(addDays(parseLocalDate(todayIso), -POSTNATAL_DAYS));
  const soonIso = toISODate(addDays(parseLocalDate(todayIso), 7));
  const isDemo = isDemoActive(await cookies());
  const raw: Raw = isDemo ? getDemoPostnatalData() : await loadRaw({ since });

  const rows: PostnatalDueRow[] = [];
  const overdue = new Set<string>(); // patient ids with an overdue visit or vaccine
  for (const p of raw.patients) {
    if (p.delivery_date < since || p.delivery_date > todayIso) continue;
    const pn = buildPostnatal(p, raw, todayIso);
    if (!pn) continue;

    const nextVisit = pn.visits.find((v) => v.status !== "done") ?? null;
    const visitNeeded = pn.visits.some((v) => v.status === "due" || v.status === "overdue" || (v.status === "upcoming" && v.due_from <= soonIso));
    const pendingVaccines = pn.vaccines.filter((v) => v.status !== "given").length;
    if (!visitNeeded && pendingVaccines === 0 && !pn.urgent) continue;

    const overdueVaccines = pn.vaccines.filter((v) => v.status === "overdue").length;
    rows.push({
      patientId: p.id,
      name: p.name,
      clinicPatientNo: p.clinic_patient_no,
      deliveryDate: p.delivery_date,
      dayOfLife: dayOfLife(p.delivery_date, todayIso),
      nextVisit,
      pendingVaccines,
      overdueVaccines,
      urgent: pn.urgent,
      flags: [...new Set([...pn.motherFlags, ...pn.newborns.flatMap((n) => n.flags)])],
    });
    if (overdueVaccines > 0 || pn.visits.some((v) => v.status === "overdue")) overdue.add(p.id);
  }

  return rows.sort((a, b) =>
    Number(b.urgent) - Number(a.urgent) ||
    Number(overdue.has(b.patientId)) - Number(overdue.has(a.patientId)) ||
    (a.nextVisit?.due_from ?? "9999").localeCompare(b.nextVisit?.due_from ?? "9999"));
});
