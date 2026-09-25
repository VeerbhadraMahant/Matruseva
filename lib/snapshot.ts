import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { gestationalAge, type GestationalAge } from "@/lib/pregnancy";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { parseLocalDate, daysBetween } from "@/lib/format";
import { patientFlags, vitalsFlags, sortFlags, type ClinicalFlag } from "@/lib/clinical";
import type { CareEventStatus, FollowUpRisk } from "@/lib/supabase/enums";

export interface OpenEvent {
  id: string;
  name: string;
  kind: string;
  dueFrom: string;
  dueTo: string;
  status: Extract<CareEventStatus, "due" | "overdue">;
}

export interface LatestVisit {
  visitDate: string;
  bpSys: number | null;
  bpDia: number | null;
  hb: number | null;
  fhr: number | null;
  nextVisitDate: string | null;
}

export interface PatientRow {
  id: string;
  name: string;
  phone: string | null;
  clinicNo: string | null;
  age: number | null;
  gravida: number | null;
  para: number | null;
  rhNegative: boolean;
  lmp: string | null;
  edd: string | null;
  ga: GestationalAge | null;
  risk: FollowUpRisk;
  noAnswerStreak: number;
  nextVisitDate: string | null;
  latestVisit: LatestVisit | null;
  overdue: OpenEvent[];
  due: OpenEvent[];
  flags: ClinicalFlag[];
}

function eddIso(lmp: string): string {
  const d = parseLocalDate(lmp);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 280));
}

/**
 * Everything the worklist screens need about active pregnancies, fetched in
 * one parallel batch (4 queries, no waterfall) and shared across the page
 * via cache(). RLS scopes every query to the caller's clinic.
 */
export const getClinicSnapshot = cache(async () => {
  const supabase = await createClient();
  const today = todayInClinicTimezone();

  const [{ data: patients }, { data: events }, { data: risks }, { data: visits }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, name, phone, clinic_patient_no, age, gravida, para, rh_negative, blood_group, lmp, edd")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("care_event_status")
      .select("id, patient_id, name, kind, due_from, due_to, status")
      .in("status", ["due", "overdue"])
      .order("due_to"),
    supabase.from("patient_followup_risk").select("patient_id, risk, next_visit_date, no_answer_streak"),
    supabase
      .from("visits")
      .select("patient_id, visit_date, bp_sys, bp_dia, hb, fhr, next_visit_date")
      .order("visit_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const riskBy = new Map((risks ?? []).map((r) => [r.patient_id, r]));
  const latestVisitBy = new Map<string, LatestVisit>();
  for (const v of visits ?? []) {
    if (latestVisitBy.has(v.patient_id)) continue;
    latestVisitBy.set(v.patient_id, {
      visitDate: v.visit_date,
      bpSys: v.bp_sys,
      bpDia: v.bp_dia,
      hb: v.hb,
      fhr: v.fhr,
      nextVisitDate: v.next_visit_date,
    });
  }
  const eventsBy = new Map<string, OpenEvent[]>();
  for (const e of events ?? []) {
    if (!e.patient_id || !e.id) continue;
    const list = eventsBy.get(e.patient_id) ?? [];
    list.push({
      id: e.id,
      name: e.name!,
      kind: e.kind!,
      dueFrom: e.due_from!,
      dueTo: e.due_to!,
      status: e.status as OpenEvent["status"],
    });
    eventsBy.set(e.patient_id, list);
  }

  const rows: PatientRow[] = (patients ?? []).map((p) => {
    const ga = p.lmp ? gestationalAge(parseLocalDate(p.lmp), today) : null;
    const risk = riskBy.get(p.id);
    const latestVisit = latestVisitBy.get(p.id) ?? null;
    const open = eventsBy.get(p.id) ?? [];
    return {
      id: p.id,
      name: p.name,
      phone: p.phone,
      clinicNo: p.clinic_patient_no,
      age: p.age,
      gravida: p.gravida,
      para: p.para,
      rhNegative: p.rh_negative,
      lmp: p.lmp,
      edd: p.edd ?? (p.lmp ? eddIso(p.lmp) : null),
      ga,
      risk: (risk?.risk as FollowUpRisk) ?? "on_track",
      noAnswerStreak: risk?.no_answer_streak ?? 0,
      nextVisitDate: risk?.next_visit_date ?? null,
      latestVisit,
      overdue: open.filter((e) => e.status === "overdue"),
      due: open.filter((e) => e.status === "due"),
      flags: sortFlags([
        ...(latestVisit ? vitalsFlags(latestVisit) : []),
        ...patientFlags({ age: p.age, gravida: p.gravida, rhNegative: p.rh_negative, bloodGroup: p.blood_group, gaWeeks: ga?.weeks ?? null }),
      ]),
    };
  });

  return { rows, today, todayIso: toISODate(today) };
});

/** Days the oldest open overdue item has been overdue (0 if none). */
export function daysOverdue(row: PatientRow, today: Date): number {
  if (row.overdue.length === 0) return 0;
  return Math.max(...row.overdue.map((e) => daysBetween(parseLocalDate(e.dueTo), today)));
}

export function needsFollowUp(row: PatientRow): boolean {
  return row.risk !== "on_track" || row.overdue.length > 0;
}

/** Lower sorts first: lost, then critical clinical flags, then most overdue, then at-risk. */
export function followUpPriority(row: PatientRow, today: Date): number {
  if (row.risk === "lost") return 0;
  if (row.flags.some((f) => f.severity === "critical")) return 1;
  if (row.overdue.length > 0) return 2 - Math.min(daysOverdue(row, today), 999) / 1000;
  return 3;
}
