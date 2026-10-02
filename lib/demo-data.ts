import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { gestationalAge } from "@/lib/pregnancy";
import { parseLocalDate } from "@/lib/format";
import { patientFlags, vitalsFlags, sortFlags } from "@/lib/clinical";
import type { PatientRow, OpenEvent, LatestVisit } from "@/lib/snapshot";
import type { CareEventStatus, FollowUpRisk, ContactOutcome } from "@/lib/supabase/enums";

export interface DemoPatientRaw {
  id: string;
  name: string;
  clinicPatientNo: string;
  phone: string;
  altPhone?: string;
  address: string;
  age: number;
  gravida: number;
  para: number;
  bloodGroup: string;
  rhNegative: boolean;
  weeksPregnant: number;
  risk: FollowUpRisk;
  noAnswerStreak: number;
  status?: "active" | "delivered" | "closed";
  pregnancyStatus?: "active" | "delivered" | "closed";
  deliveryDate?: string;
  deliveryMode?: "NVD" | "LSCS";
  birthWeightKg?: number;
  closedAt?: string;
  closedBy?: string;
  latestVisit?: {
    daysAgo: number;
    bpSys: number;
    bpDia: number;
    hb: number;
    fhr: number;
  };
  overdueEvents?: { name: string; kind: string; daysOverdue: number }[];
  dueEvents?: { name: string; kind: string; dueInDays: number }[];
}

const RAW_DEMO_PATIENTS: DemoPatientRaw[] = [
  {
    id: "p1-pooja-deshmukh",
    name: "Pooja Deshmukh",
    clinicPatientNo: "ANC-101",
    phone: "9820123456",
    altPhone: "9820199999",
    address: "Shivpur Colony, Pune",
    age: 26,
    gravida: 2,
    para: 1,
    bloodGroup: "B+",
    rhNegative: false,
    weeksPregnant: 21.5,
    risk: "at_risk",
    noAnswerStreak: 0,
    latestVisit: { daysAgo: 14, bpSys: 118, bpDia: 76, hb: 10.4, fhr: 146 },
    overdueEvents: [{ name: "Anomaly Scan (TIFFA)", kind: "scan", daysOverdue: 5 }],
    dueEvents: [{ name: "Td Dose 2", kind: "injection", dueInDays: 3 }],
  },
  {
    id: "p2-sunita-verma",
    name: "Sunita Verma",
    clinicPatientNo: "ANC-102",
    phone: "9845012345",
    altPhone: "9845098765",
    address: "Ganeshpuri, Ward 4",
    age: 31,
    gravida: 1,
    para: 0,
    bloodGroup: "O+",
    rhNegative: false,
    weeksPregnant: 28.2,
    risk: "at_risk",
    noAnswerStreak: 1,
    latestVisit: { daysAgo: 21, bpSys: 138, bpDia: 88, hb: 9.8, fhr: 142 },
    overdueEvents: [],
    dueEvents: [{ name: "OGTT Sugar Screening", kind: "test", dueInDays: 2 }],
  },
  {
    id: "p3-kavita-patel",
    name: "Kavita Patel",
    clinicPatientNo: "ANC-103",
    phone: "9712345678",
    address: "Lakshmi Nagar, Surat",
    age: 24,
    gravida: 1,
    para: 0,
    bloodGroup: "A+",
    rhNegative: false,
    weeksPregnant: 12.8,
    risk: "on_track",
    noAnswerStreak: 0,
    latestVisit: { daysAgo: 7, bpSys: 110, bpDia: 70, hb: 12.2, fhr: 154 },
    overdueEvents: [],
    dueEvents: [{ name: "NT Scan + Double Marker", kind: "scan", dueInDays: 4 }],
  },
  {
    id: "p4-priya-sharma",
    name: "Priya Sharma",
    clinicPatientNo: "ANC-104",
    phone: "9811122233",
    address: "Nehru Ward, Flat 302",
    age: 28,
    gravida: 2,
    para: 0,
    bloodGroup: "O-",
    rhNegative: true,
    weeksPregnant: 27.5,
    risk: "on_track",
    noAnswerStreak: 0,
    latestVisit: { daysAgo: 10, bpSys: 114, bpDia: 74, hb: 11.0, fhr: 140 },
    overdueEvents: [],
    dueEvents: [{ name: "Anti-D Prophylaxis Injection", kind: "injection", dueInDays: 4 }],
  },
  {
    id: "p5-rekha-yadav",
    name: "Rekha Yadav",
    clinicPatientNo: "ANC-105",
    phone: "9833344455",
    address: "Rampur Basti",
    age: 33,
    gravida: 3,
    para: 2,
    bloodGroup: "B-",
    rhNegative: true,
    weeksPregnant: 34.2,
    risk: "at_risk",
    noAnswerStreak: 2,
    latestVisit: { daysAgo: 28, bpSys: 142, bpDia: 92, hb: 8.9, fhr: 138 },
    overdueEvents: [{ name: "Growth Scan + Doppler (34w)", kind: "scan", daysOverdue: 9 }],
    dueEvents: [],
  },
  {
    id: "p6-anita-joshi",
    name: "Anita Joshi",
    clinicPatientNo: "ANC-106",
    phone: "9876543210",
    address: "Kothari Compound",
    age: 29,
    gravida: 1,
    para: 0,
    bloodGroup: "AB+",
    rhNegative: false,
    weeksPregnant: 36.4,
    risk: "on_track",
    noAnswerStreak: 0,
    latestVisit: { daysAgo: 4, bpSys: 120, bpDia: 78, hb: 11.8, fhr: 144 },
    overdueEvents: [],
    dueEvents: [{ name: "Weekly Non-Stress Test (NST)", kind: "test", dueInDays: 3 }],
  },
  {
    id: "p7-meena-kumari",
    name: "Meena Kumari",
    clinicPatientNo: "ANC-107",
    phone: "9988776655",
    address: "Shivaji Nagar",
    age: 22,
    gravida: 1,
    para: 0,
    bloodGroup: "A-",
    rhNegative: true,
    weeksPregnant: 8.5,
    risk: "on_track",
    noAnswerStreak: 0,
    latestVisit: { daysAgo: 5, bpSys: 112, bpDia: 72, hb: 12.0, fhr: 160 },
    overdueEvents: [],
    dueEvents: [{ name: "Dating / Viability Scan", kind: "scan", dueInDays: 5 }],
  },
  {
    id: "p8-neha-singh",
    name: "Neha Singh",
    clinicPatientNo: "ANC-108",
    phone: "9123456789",
    address: "Adarsh Nagar",
    age: 27,
    gravida: 2,
    para: 1,
    bloodGroup: "O+",
    rhNegative: false,
    weeksPregnant: 23.1,
    risk: "lost",
    noAnswerStreak: 3,
    latestVisit: { daysAgo: 38, bpSys: 122, bpDia: 80, hb: 10.2, fhr: 140 },
    overdueEvents: [{ name: "Anomaly Scan (TIFFA)", kind: "scan", daysOverdue: 16 }],
    dueEvents: [],
  },
  {
    id: "p9-divya-nair",
    name: "Divya Nair",
    clinicPatientNo: "ANC-109",
    phone: "9822001122",
    address: "MG Road, Flat 4B",
    age: 30,
    gravida: 1,
    para: 0,
    bloodGroup: "B+",
    rhNegative: false,
    weeksPregnant: 19.4,
    risk: "on_track",
    noAnswerStreak: 0,
    latestVisit: { daysAgo: 12, bpSys: 116, bpDia: 74, hb: 11.4, fhr: 148 },
    overdueEvents: [],
    dueEvents: [{ name: "Anomaly Scan (TIFFA)", kind: "scan", dueInDays: 6 }],
  },
  {
    id: "p10-shweta-kulkarni",
    name: "Shweta Kulkarni",
    clinicPatientNo: "ANC-110",
    phone: "9899001122",
    address: "Model Colony, Pune",
    age: 32,
    gravida: 2,
    para: 1,
    bloodGroup: "A+",
    rhNegative: false,
    weeksPregnant: 31.0,
    risk: "on_track",
    noAnswerStreak: 0,
    latestVisit: { daysAgo: 8, bpSys: 124, bpDia: 82, hb: 10.8, fhr: 136 },
    overdueEvents: [],
    dueEvents: [{ name: "Growth Scan (32w)", kind: "scan", dueInDays: 7 }],
  },
];

export function getDemoSnapshot(): { rows: PatientRow[]; today: Date; todayIso: string } {
  const today = todayInClinicTimezone();
  const todayIso = toISODate(today);

  // Delivered or closed pregnancies are excluded from the active worklist & follow-up queues
  const activePatients = RAW_DEMO_PATIENTS.filter((p) => !p.status || p.status === "active");

  const rows: PatientRow[] = activePatients.map((p) => {
    const lmpDate = new Date(today);
    lmpDate.setDate(lmpDate.getDate() - Math.round(p.weeksPregnant * 7));
    const lmpIso = toISODate(lmpDate);

    const eddDate = new Date(lmpDate);
    eddDate.setDate(eddDate.getDate() + 280);
    const edd = toISODate(eddDate);

    const lmpParsed = parseLocalDate(lmpIso);
    const ga = gestationalAge(lmpParsed, today);

    const overdue: OpenEvent[] = (p.overdueEvents ?? []).map((e, idx) => ({
      id: `ovd-${p.id}-${idx}`,
      name: e.name,
      kind: e.kind,
      dueFrom: toISODate(new Date(today.getTime() - (e.daysOverdue + 7) * 86400000)),
      dueTo: toISODate(new Date(today.getTime() - e.daysOverdue * 86400000)),
      status: "overdue" as const,
    }));

    const due: OpenEvent[] = (p.dueEvents ?? []).map((e, idx) => ({
      id: `due-${p.id}-${idx}`,
      name: e.name,
      kind: e.kind,
      dueFrom: toISODate(new Date(today.getTime() - 2 * 86400000)),
      dueTo: toISODate(new Date(today.getTime() + e.dueInDays * 86400000)),
      status: "due" as const,
    }));

    let latestVisit: LatestVisit | null = null;
    if (p.latestVisit) {
      const vDate = new Date(today);
      vDate.setDate(vDate.getDate() - p.latestVisit.daysAgo);
      latestVisit = {
        visitDate: toISODate(vDate),
        bpSys: p.latestVisit.bpSys,
        bpDia: p.latestVisit.bpDia,
        hb: p.latestVisit.hb,
        fhr: p.latestVisit.fhr,
        nextVisitDate: toISODate(new Date(today.getTime() + 14 * 86400000)),
      };
    }

    const flags = sortFlags([
      ...(latestVisit ? vitalsFlags({ bpSys: latestVisit.bpSys, bpDia: latestVisit.bpDia, hb: latestVisit.hb, fhr: latestVisit.fhr }) : []),
      ...patientFlags({ age: p.age, gravida: p.gravida, rhNegative: p.rhNegative, bloodGroup: p.bloodGroup, gaWeeks: ga?.weeks ?? null }),
    ]);

    return {
      id: p.id,
      name: p.name,
      phone: p.phone,
      clinicNo: p.clinicPatientNo,
      age: p.age,
      gravida: p.gravida,
      para: p.para,
      rhNegative: p.rhNegative,
      lmp: lmpIso,
      edd,
      ga,
      risk: p.risk,
      noAnswerStreak: p.noAnswerStreak,
      nextVisitDate: latestVisit?.nextVisitDate ?? null,
      latestVisit,
      overdue,
      due,
      flags,
    };
  });

  return { rows, today, todayIso };
}

export function getDemoPatientDetail(id: string) {
  const patientRaw = RAW_DEMO_PATIENTS.find((p) => p.id === id) || RAW_DEMO_PATIENTS[0];
  const today = todayInClinicTimezone();
  const lmpDate = new Date(today);
  lmpDate.setDate(lmpDate.getDate() - Math.round(patientRaw.weeksPregnant * 7));
  const lmpIso = toISODate(lmpDate);

  const eddDate = new Date(lmpDate);
  eddDate.setDate(eddDate.getDate() + 280);
  const eddIso = toISODate(eddDate);

  const careEvents = [
    { id: "ce-1", name: "Booking visit + Labs", kind: "test", due_from: "2026-05-01", due_to: "2026-05-30", completed_at: "2026-05-10", status: "done" },
    { id: "ce-2", name: "Dating / Viability scan", kind: "scan", due_from: "2026-05-15", due_to: "2026-06-01", completed_at: "2026-05-20", status: "done" },
    { id: "ce-3", name: "NT Scan + Double Marker", kind: "scan", due_from: "2026-06-15", due_to: "2026-07-05", completed_at: patientRaw.weeksPregnant > 14 ? "2026-06-25" : null, status: patientRaw.weeksPregnant > 14 ? "done" : "upcoming" },
    { id: "ce-4", name: "Anomaly Scan (TIFFA)", kind: "scan", due_from: "2026-08-01", due_to: "2026-08-25", completed_at: null, status: (patientRaw.overdueEvents?.some((e) => e.name.includes("Anomaly")) ? "overdue" : "due") as CareEventStatus },
    { id: "ce-5", name: "Td Dose 1", kind: "injection", due_from: "2026-07-15", due_to: "2026-08-15", completed_at: "2026-08-05", status: "done" },
    { id: "ce-6", name: "OGTT Sugar Screening", kind: "test", due_from: "2026-09-10", due_to: "2026-10-05", completed_at: null, status: "upcoming" },
    { id: "ce-7", name: "Growth Scan + Doppler (32w)", kind: "scan", due_from: "2026-10-15", due_to: "2026-11-05", completed_at: null, status: "upcoming" },
  ];

  const visits = [
    {
      id: "v-1",
      patient_id: patientRaw.id,
      visit_date: toISODate(new Date(today.getTime() - 14 * 86400000)),
      bp_sys: patientRaw.latestVisit?.bpSys ?? 120,
      bp_dia: patientRaw.latestVisit?.bpDia ?? 80,
      hb: patientRaw.latestVisit?.hb ?? 11.2,
      fhr: patientRaw.latestVisit?.fhr ?? 144,
      weight: 58.5,
      fundal_height: 22,
      notes: "Fetal movements good. Prescribed iron & calcium tablets.",
      next_visit_date: toISODate(new Date(today.getTime() + 14 * 86400000)),
      created_at: new Date(today.getTime() - 14 * 86400000).toISOString(),
    },
    {
      id: "v-2",
      patient_id: patientRaw.id,
      visit_date: toISODate(new Date(today.getTime() - 42 * 86400000)),
      bp_sys: 116,
      bp_dia: 74,
      hb: 11.5,
      fhr: 150,
      weight: 56.0,
      fundal_height: 18,
      notes: "First trimester labs reviewed. All normal.",
      next_visit_date: toISODate(new Date(today.getTime() - 14 * 86400000)),
      created_at: new Date(today.getTime() - 42 * 86400000).toISOString(),
    },
  ];

  const isDeliveredOrClosed = patientRaw.status === "delivered" || patientRaw.status === "closed";

  return {
    patient: {
      id: patientRaw.id,
      clinic_id: "00000000-0000-0000-0000-000000000002",
      clinic_patient_no: patientRaw.clinicPatientNo,
      name: patientRaw.name,
      phone: patientRaw.phone,
      alt_phone: patientRaw.altPhone || null,
      address: patientRaw.address,
      age: patientRaw.age,
      gravida: patientRaw.gravida,
      para: patientRaw.para,
      blood_group: patientRaw.bloodGroup,
      rh_negative: patientRaw.rhNegative,
      lmp: lmpIso,
      edd: eddIso,
      edd_source: "lmp",
      status: patientRaw.status || "active",
      pregnancy_status: patientRaw.pregnancyStatus || patientRaw.status || "active",
      delivery_date: patientRaw.deliveryDate || null,
      delivery_mode: patientRaw.deliveryMode || null,
      birth_weight_kg: patientRaw.birthWeightKg || null,
      closed_at: patientRaw.closedAt || null,
      closed_by: patientRaw.closedBy || null,
      created_at: "2026-05-01T10:00:00Z",
      updated_at: new Date().toISOString(),
    },
    careEvents: isDeliveredOrClosed
      ? careEvents.map((ce) => (ce.completed_at ? ce : { ...ce, status: "skipped" as CareEventStatus, skipped_reason: "Pregnancy closed / delivered" }))
      : careEvents,
    visits,
    documents: [],
    contacts: [
      {
        id: "c-1",
        channel: "whatsapp",
        outcome: "reached" as ContactOutcome,
        notes: "Reminder sent for upcoming scan",
        created_at: new Date(today.getTime() - 2 * 86400000).toISOString(),
      },
    ],
    risk: {
      risk: isDeliveredOrClosed ? "on_track" : patientRaw.risk,
      next_visit_date: isDeliveredOrClosed ? null : toISODate(new Date(today.getTime() + 14 * 86400000)),
      no_answer_streak: isDeliveredOrClosed ? 0 : patientRaw.noAnswerStreak,
    },
  };
}

export function closeDemoPregnancy(
  patientId: string,
  data: {
    deliveryDate: string;
    deliveryMode: "NVD" | "LSCS";
    birthWeightKg: number;
    notes?: string;
  },
  doctorName = "Dr. Demo"
): { error: string | null } {
  const patient = RAW_DEMO_PATIENTS.find((p) => p.id === patientId);
  if (!patient) {
    return { error: "Patient record not found." };
  }

  if (patient.status === "delivered" || patient.status === "closed") {
    return { error: "This pregnancy has already been closed." };
  }

  patient.status = "delivered";
  patient.pregnancyStatus = "delivered";
  patient.deliveryDate = data.deliveryDate;
  patient.deliveryMode = data.deliveryMode;
  patient.birthWeightKg = data.birthWeightKg;
  patient.closedAt = new Date().toISOString();
  patient.closedBy = doctorName;
  patient.overdueEvents = [];
  patient.dueEvents = [];
  patient.risk = "on_track";

  return { error: null };
}

export function logDemoBatchContacts(
  patientIds: string[],
  outcome: ContactOutcome,
  _notes?: string
): { error: string | null; loggedCount: number; skippedCount: number } {
  void _notes;
  let loggedCount = 0;
  let skippedCount = 0;

  for (const pid of patientIds) {
    const patient = RAW_DEMO_PATIENTS.find((p) => p.id === pid);
    if (!patient || patient.status === "delivered" || patient.status === "closed") {
      skippedCount++;
      continue;
    }

    loggedCount++;
    if (outcome === "reached" || outcome === "will_visit") {
      patient.noAnswerStreak = 0;
    } else if (outcome === "no_answer") {
      patient.noAnswerStreak += 1;
    }
  }

  return { error: null, loggedCount, skippedCount };
}

export function getDemoContactStats(): { reached: number; total: number; successRate: number } {
  // Synthesized realistic metrics from demo call activities
  const reached = 38;
  const total = 46;
  const successRate = total > 0 ? Math.round((reached / total) * 100) : 0;
  return { reached, total, successRate };
}

export function getDemoDeliveriesThisMonthCount(): number {
  const today = todayInClinicTimezone();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  return RAW_DEMO_PATIENTS.filter(
    (p) => (p.status === "delivered" || p.status === "closed") && p.deliveryDate?.startsWith(currentYearMonth)
  ).length;
}

