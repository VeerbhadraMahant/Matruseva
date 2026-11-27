import fs from "node:fs";
import path from "node:path";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { gestationalAge } from "@/lib/pregnancy";
import { parseLocalDate } from "@/lib/format";
import { patientFlags, vitalsFlags, sortFlags } from "@/lib/clinical";
import { CLINICAL_RISK_THRESHOLDS } from "@/lib/clinicalProtocols";
import { isManualContact } from "@/lib/followUp";
import { computeFollowUpRisk } from "@/lib/risk";
import type { PatientRow, OpenEvent, LatestVisit } from "@/lib/snapshot";
import type { CareEventStatus, FollowUpRisk, ContactOutcome } from "@/lib/supabase/enums";

export interface DemoPatientRaw {
  id: string;
  name: string;
  clinicPatientNo?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  address?: string | null;
  age?: number | null;
  gravida?: number | null;
  para?: number | null;
  bloodGroup?: string | null;
  rhNegative: boolean;
  weeksPregnant: number;
  lmp?: string | null;
  edd?: string | null;
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
  createdAt?: string;
  obstetricQuestionnaire?: import("@/lib/obstetricQuestionnaire").ObstetricQuestionnaireData;
}

export interface DemoVisitRecord {
  id: string;
  patient_id: string;
  visit_date: string;
  bp_sys: number | null;
  bp_dia: number | null;
  weight: number | null;
  hb: number | null;
  fhr: number | null;
  fundal_height: number | null;
  notes: string | null;
  next_visit_date: string | null;
  created_at: string;
  /** Offline-queue idempotency key; a replay with the same key is ignored. */
  client_request_id?: string;
}

export interface DemoContactRecord {
  id: string;
  channel: "call" | "whatsapp";
  outcome: ContactOutcome;
  notes: string | null;
  created_at: string;
  client_request_id?: string;
}

export interface DemoDocumentRecord {
  id: string;
  clinic_id: string;
  doc_type: string;
  doc_date: string | null;
  source: string;
  storage_path: string;
  ocr_status: "pending" | "done" | "failed" | "skipped";
  ocr_text: string | null;
  created_at: string;
  patient_id: string | null;
  data_url?: string | null;
  /** Which engine read the text (sarvam | tesseract | pdf-text). */
  ocr_engine?: string | null;
}

interface DemoDoctorProfile {
  fullName: string;
  degree: string | null;
  yearsOfExperience: number | null;
}

export interface DemoStoreState {
  doctorProfile?: DemoDoctorProfile;
  patients: DemoPatientRaw[];
  completedEvents: Record<string, string[]>;
  completedEventDates?: Record<string, Record<string, string>>;
  visits: Record<string, DemoVisitRecord[]>;
  contacts: Record<string, DemoContactRecord[]>;
  documents: DemoDocumentRecord[];
}

const STORE_FILE_PATH = process.env.MATRUSETU_DEMO_STORE_PATH ?? path.join(process.cwd(), ".matrusetu-demo-store.json");

declare global {
  var __matrusetu_demo_store__: DemoStoreState | undefined;
  var __matrusetu_demo_snapshot_cache__: { rows: PatientRow[]; today: Date; todayIso: string } | null | undefined;
  var __matrusetu_demo_detail_cache__: Map<string, { todayIso: string; data: unknown }> | undefined;
}

const INITIAL_RAW_DEMO_PATIENTS: DemoPatientRaw[] = [
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

export const DEMO_SCHEDULE_ITEMS = [
  { id: "ce-1", name: "Booking visit + Labs", kind: "test", windowStartWeek: 6, windowEndWeek: 10, isCritical: false },
  { id: "ce-2", name: "Dating / Viability scan", kind: "scan", windowStartWeek: 7, windowEndWeek: 11, isCritical: false },
  { id: "ce-3", name: "NT Scan + Double Marker", kind: "scan", windowStartWeek: 11, windowEndWeek: 14, isCritical: false },
  { id: "ce-4", name: "Anomaly Scan (TIFFA)", kind: "scan", windowStartWeek: 18, windowEndWeek: 22, isCritical: true },
  { id: "ce-5", name: "Td Dose 1", kind: "injection", windowStartWeek: 20, windowEndWeek: 24, isCritical: false },
  { id: "ce-6", name: "OGTT Sugar Screening", kind: "test", windowStartWeek: 24, windowEndWeek: 28, isCritical: true },
  { id: "ce-cbc", name: "Repeat CBC", kind: "test", windowStartWeek: 28, windowEndWeek: 28, isCritical: false },
  { id: "ce-rh", name: "Anti-D Prophylaxis (28w)", kind: "injection", windowStartWeek: 28, windowEndWeek: 30, isCritical: true },
  { id: "ce-7", name: "Growth Scan + Doppler (32w)", kind: "scan", windowStartWeek: 32, windowEndWeek: 36, isCritical: false },
];

export const INITIAL_DEMO_DOCUMENTS: DemoDocumentRecord[] = [
  {
    id: "doc-demo-1",
    clinic_id: "demo-clinic-id",
    doc_type: "scan",
    doc_date: "2026-09-15",
    source: "camera",
    storage_path: "demo/inbox/doc-demo-1.jpg",
    ocr_status: "done",
    ocr_text: "OBSTETRIC ULTRASOUND REPORT\nPatient: Pooja Deshmukh | GA: 20w 4d\nSingle intrauterine gestation. FHR: 146 bpm. Placenta: Posterior. No gross anomalies detected.",
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    patient_id: null,
  },
  {
    id: "doc-demo-2",
    clinic_id: "demo-clinic-id",
    doc_type: "report",
    doc_date: "2026-09-18",
    source: "whatsapp",
    storage_path: "demo/inbox/doc-demo-2.jpg",
    ocr_status: "done",
    ocr_text: "PATHOLOGY LAB REPORT\nHemoglobin: 9.8 g/dL (Mild Anemia)\nBlood Group: B Rh Positive\nBlood Sugar (Random): 112 mg/dL\nUrine Routine: Albumin Nil",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    patient_id: null,
  },
  {
    id: "doc-demo-3",
    clinic_id: "demo-clinic-id",
    doc_type: "register_page",
    doc_date: "2026-09-20",
    source: "camera",
    storage_path: "demo/opd-register/doc-demo-3.jpg",
    ocr_status: "done",
    ocr_text: "OPD REGISTER - MATRUSETU CLINIC\nDate: 2026-09-20\n1. Sunita Verma - ANC Checkup - BP 110/70 - Hb 11.2\n2. Kavita Shinde - ANC 34w - Normal\n3. Rekha Patil - First Trimester Intake",
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    patient_id: null,
  },
];

function initFreshStore(): DemoStoreState {
  return {
    patients: JSON.parse(JSON.stringify(INITIAL_RAW_DEMO_PATIENTS)),
    completedEvents: {},
    visits: {},
    contacts: {},
    documents: JSON.parse(JSON.stringify(INITIAL_DEMO_DOCUMENTS)),
  };
}

export function getDemoStore(): DemoStoreState {
  if (globalThis.__matrusetu_demo_store__) {
    return globalThis.__matrusetu_demo_store__;
  }

  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const data = fs.readFileSync(STORE_FILE_PATH, "utf8");
      const parsed = JSON.parse(data) as DemoStoreState;
      if (parsed && Array.isArray(parsed.patients)) {
        if (!Array.isArray(parsed.documents)) {
          parsed.documents = JSON.parse(JSON.stringify(INITIAL_DEMO_DOCUMENTS));
        }
        globalThis.__matrusetu_demo_store__ = parsed;
        return parsed;
      }
    }
  } catch {
    // If reading fails, fall back to fresh
  }

  const fresh = initFreshStore();
  globalThis.__matrusetu_demo_store__ = fresh;
  saveDemoStore(fresh);
  return fresh;
}

export function saveDemoStore(store: DemoStoreState): void {
  globalThis.__matrusetu_demo_store__ = store;
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Graceful fallback if fs is restricted
  }
}

export function getDemoDoctorProfile(): DemoDoctorProfile {
  return getDemoStore().doctorProfile ?? { fullName: "Dr. Demo", degree: "MBBS, MD", yearsOfExperience: 12 };
}

export function setDemoDoctorProfile(profile: DemoDoctorProfile): void {
  saveDemoStore({ ...getDemoStore(), doctorProfile: profile });
}

export function resetDemoStore(): void {
  const fresh = initFreshStore();
  saveDemoStore(fresh);
  invalidateDemoCache();
}

// Backward compatibility proxy for any code accessing RAW_DEMO_PATIENTS
export const RAW_DEMO_PATIENTS: DemoPatientRaw[] = new Proxy([] as DemoPatientRaw[], {
  get(_target, prop) {
    const store = getDemoStore();
    return Reflect.get(store.patients, prop);
  },
  set(_target, prop, value) {
    const store = getDemoStore();
    const result = Reflect.set(store.patients, prop, value);
    saveDemoStore(store);
    return result;
  },
});

export function invalidateDemoCache(): void {
  globalThis.__matrusetu_demo_snapshot_cache__ = null;
  if (globalThis.__matrusetu_demo_detail_cache__) {
    globalThis.__matrusetu_demo_detail_cache__.clear();
  }
}

export function getDemoSnapshot(): { rows: PatientRow[]; today: Date; todayIso: string } {
  const today = todayInClinicTimezone();
  const todayIso = toISODate(today);

  if (globalThis.__matrusetu_demo_snapshot_cache__ && globalThis.__matrusetu_demo_snapshot_cache__.todayIso === todayIso) {
    return globalThis.__matrusetu_demo_snapshot_cache__;
  }

  const store = getDemoStore();
  // Delivered or closed pregnancies are excluded from the active worklist & follow-up queues
  const activePatients = store.patients.filter((p) => !p.status || p.status === "active");

  const rows: PatientRow[] = activePatients.map((p) => {
    const lmpDate = p.lmp ? parseLocalDate(p.lmp) : new Date(today);
    if (!p.lmp) lmpDate.setDate(lmpDate.getDate() - Math.round(p.weeksPregnant * 7));
    const lmpIso = p.lmp || toISODate(lmpDate);

    const eddDate = new Date(lmpDate);
    eddDate.setDate(eddDate.getDate() + 280);
    const edd = p.edd || toISODate(eddDate);

    const lmpParsed = parseLocalDate(lmpIso);
    const ga = gestationalAge(lmpParsed, today);

    const detail = getDemoPatientDetail(p.id);
    const open = detail.careEvents.flatMap((event): OpenEvent[] =>
      event.status === "due" || event.status === "overdue" || event.status === "upcoming"
        ? [{
            id: event.id, name: event.name, kind: event.kind,
            dueFrom: event.due_from, dueTo: event.due_to, status: event.status,
          }]
        : [],
    );
    const visit = detail.visits[0];
    const latestVisit: LatestVisit | null = visit ? {
      visitDate: visit.visit_date,
      bpSys: visit.bp_sys,
      bpDia: visit.bp_dia,
      hb: visit.hb,
      fhr: visit.fhr,
      nextVisitDate: detail.risk.next_visit_date,
    } : null;

    const flags = sortFlags([
      ...(latestVisit ? vitalsFlags({ bpSys: latestVisit.bpSys, bpDia: latestVisit.bpDia, hb: latestVisit.hb, fhr: latestVisit.fhr }) : []),
      ...patientFlags({
        age: p.age ?? null,
        gravida: p.gravida ?? null,
        rhNegative: p.rhNegative,
        bloodGroup: p.bloodGroup ?? null,
        gaWeeks: ga?.weeks ?? null,
      }),
    ]);

    return {
      id: p.id,
      name: p.name,
      phone: p.phone ?? null,
      clinicNo: p.clinicPatientNo ?? null,
      age: p.age ?? null,
      gravida: p.gravida ?? null,
      para: p.para ?? null,
      rhNegative: p.rhNegative,
      lmp: lmpIso,
      edd,
      ga,
      risk: detail.risk.risk,
      noAnswerStreak: detail.risk.no_answer_streak,
      nextVisitDate: detail.risk.next_visit_date,
      latestVisit,
      overdue: open.filter((event) => event.status === "overdue"),
      due: open.filter((event) => event.status === "due"),
      upcoming: open.filter((event) => event.status === "upcoming"),
      flags,
      createdAt: p.createdAt ?? "2026-04-01T08:00:00Z",
    };
  });

  globalThis.__matrusetu_demo_snapshot_cache__ = { rows, today, todayIso };
  return globalThis.__matrusetu_demo_snapshot_cache__;
}

function computeDemoPatientDetail(id: string, today: Date, todayIso: string) {
  const store = getDemoStore();
  const patientRaw = store.patients.find((p) => p.id === id) || store.patients[0];
  if (!patientRaw) return null;

  const lmpDate = patientRaw.lmp ? parseLocalDate(patientRaw.lmp) : new Date(today);
  if (!patientRaw.lmp) {
    lmpDate.setDate(lmpDate.getDate() - Math.round(patientRaw.weeksPregnant * 7));
  }
  const lmpIso = patientRaw.lmp || toISODate(lmpDate);

  const eddDate = new Date(lmpDate);
  eddDate.setDate(eddDate.getDate() + 280);
  const eddIso = patientRaw.edd || toISODate(eddDate);

  const addWeeks = (w: number) => {
    const d = new Date(lmpDate);
    d.setDate(d.getDate() + w * 7);
    return toISODate(d);
  };

  const completedList = store.completedEvents[patientRaw.id] ?? [];
  const completedSet = new Set(completedList);

  const rawEvents = DEMO_SCHEDULE_ITEMS
    .filter((item) => item.id !== "ce-rh" || patientRaw.rhNegative)
    .map((item) => ({
      id: item.id, name: item.name, kind: item.kind,
      due_from: addWeeks(item.windowStartWeek), due_to: addWeeks(item.windowEndWeek),
    }));

  const seeded = INITIAL_RAW_DEMO_PATIENTS.some((patient) => patient.id === patientRaw.id);
  const dateOffset = (days: number) =>
    toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days));
  const fixtureEvents = seeded ? [
    ...(patientRaw.overdueEvents ?? []).map((e, i) => ({
      ...e, id: `ovd-${patientRaw.id}-${i}`, from: -e.daysOverdue - 7, to: -e.daysOverdue,
    })),
    ...(patientRaw.dueEvents ?? []).map((e, i) => ({
      ...e, id: `due-${patientRaw.id}-${i}`, from: -2, to: e.dueInDays,
    })),
  ] : [];
  const eventKey = (name: string) => name.toLowerCase().split(" (")[0].replace(" injection", "");
  const fixtureByName = new Map(fixtureEvents.map((event) => [eventKey(event.name), event]));
  const schedule = rawEvents.map((event) => {
    const fixture = fixtureByName.get(eventKey(event.name));
    fixtureByName.delete(eventKey(event.name));
    return fixture
      ? { ...event, due_from: dateOffset(fixture.from), due_to: dateOffset(fixture.to), oldId: fixture.id }
      : { ...event, oldId: null };
  });
  const careEvents = [
    ...schedule,
    ...[...fixtureByName.values()].map((event) => ({
      id: event.id, name: event.name, kind: event.kind,
      due_from: dateOffset(event.from), due_to: dateOffset(event.to), oldId: null,
    })),
  ].map(({ oldId, ...event }) => {
    const completed = completedSet.has(event.id) || (oldId !== null && completedSet.has(oldId)) ||
      completedSet.has(event.name) ||
      (seeded && (event.id === "ce-1" || event.id === "ce-2" || event.id === "ce-3") && event.due_to < todayIso);
    const status: CareEventStatus = completed ? "done"
      : !seeded && patientRaw.createdAt && event.due_to < toISODate(todayInClinicTimezone(new Date(patientRaw.createdAt))) ? "skipped"
      : event.due_to < todayIso ? "overdue"
      : event.due_from <= todayIso ? "due"
      : "upcoming";
    return {
      ...event,
      completed_at: completed ? store.completedEventDates?.[patientRaw.id]?.[event.id] ?? (event.due_from < todayIso ? event.due_from : todayIso) : null,
      status,
    };
  }).sort((a, b) => a.due_from.localeCompare(b.due_from));

  const seedVisit = patientRaw.latestVisit;
  const customVisits = store.visits[patientRaw.id] ?? [];
  const visits = [...customVisits, ...(seeded && seedVisit ? [{
    id: "v-1",
    patient_id: patientRaw.id,
    visit_date: dateOffset(-seedVisit.daysAgo),
    bp_sys: seedVisit.bpSys,
    bp_dia: seedVisit.bpDia,
    hb: seedVisit.hb,
    fhr: seedVisit.fhr,
    weight: 58.5,
    fundal_height: 22,
    notes: "Fetal movements good. Prescribed iron & calcium tablets.",
    next_visit_date: dateOffset(patientRaw.id === "p2-sunita-verma" ? -10 : patientRaw.risk === "lost" ? -25 : 14),
    created_at: `${dateOffset(-seedVisit.daysAgo)}T04:30:00Z`,
  }] : [])].sort((a, b) => b.visit_date.localeCompare(a.visit_date) || b.created_at.localeCompare(a.created_at));

  const isDeliveredOrClosed = patientRaw.status === "delivered" || patientRaw.status === "closed";
  const contacts = getDemoPatientContacts(patientRaw, today);
  const noAnswerStreak = contacts.filter((contact) => isManualContact(contact.outcome)).slice(0, 2)
    .filter(({ outcome }) => outcome === "no_answer" || outcome === "wrong_number").length;
  const nextVisitDate = isDeliveredOrClosed ? null : visits.find((visit) => visit.next_visit_date)?.next_visit_date ?? null;
  const followUpRisk = computeFollowUpRisk({
    patientStatus: patientRaw.status ?? "active",
    nextVisitDate: nextVisitDate ? parseLocalDate(nextVisitDate) : null,
    hasOverdueCriticalEvent: careEvents.some((event) =>
      event.status === "overdue" && DEMO_SCHEDULE_ITEMS.some((item) => item.id === event.id && item.isCritical),
    ),
    recentContactNoAnswerStreak: noAnswerStreak,
    today,
    riskAtRiskDays: CLINICAL_RISK_THRESHOLDS.atRiskDays,
    riskLostDays: CLINICAL_RISK_THRESHOLDS.lostDays,
  });

  const result = {
    patient: {
      id: patientRaw.id,
      clinic_id: "00000000-0000-0000-0000-000000000002",
      clinic_patient_no: patientRaw.clinicPatientNo ?? null,
      name: patientRaw.name,
      phone: patientRaw.phone ?? null,
      alt_phone: patientRaw.altPhone || null,
      address: patientRaw.address ?? null,
      age: patientRaw.age ?? null,
      gravida: patientRaw.gravida ?? null,
      para: patientRaw.para ?? null,
      blood_group: patientRaw.bloodGroup ?? null,
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
      created_at: patientRaw.createdAt ?? "2026-05-01T10:00:00Z",
      obstetricQuestionnaire: patientRaw.obstetricQuestionnaire || null,
      updated_at: new Date().toISOString(),
    },
    careEvents: isDeliveredOrClosed
      ? careEvents.map((ce) => (ce.completed_at ? ce : { ...ce, status: "skipped" as CareEventStatus, skipped_reason: "Pregnancy closed / delivered" }))
      : careEvents,
    visits,
    documents: (store.documents ?? []).filter((d) => d.patient_id === patientRaw.id),
    contacts,
    risk: {
      risk: followUpRisk,
      next_visit_date: nextVisitDate,
      no_answer_streak: isDeliveredOrClosed ? 0 : noAnswerStreak,
    },
  };

  return result;
}

export type DemoPatientDetailResult = NonNullable<ReturnType<typeof computeDemoPatientDetail>>;

export function getDemoPatientDetail(id: string): DemoPatientDetailResult {
  const today = todayInClinicTimezone();
  const todayIso = toISODate(today);

  if (!globalThis.__matrusetu_demo_detail_cache__) {
    globalThis.__matrusetu_demo_detail_cache__ = new Map();
  }

  const cached = globalThis.__matrusetu_demo_detail_cache__.get(id);
  if (cached && cached.todayIso === todayIso) {
    return cached.data as DemoPatientDetailResult;
  }

  const result = computeDemoPatientDetail(id, today, todayIso)!;
  globalThis.__matrusetu_demo_detail_cache__.set(id, { todayIso, data: result });
  return result;
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
  const store = getDemoStore();
  const patient = store.patients.find((p) => p.id === patientId);
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

  saveDemoStore(store);
  invalidateDemoCache();
  return { error: null };
}

export function logDemoBatchContacts(
  patientIds: string[],
  outcome: ContactOutcome,
  notes?: string,
  channel: "call" | "whatsapp" = "call"
): { error: string | null; loggedCount: number; skippedCount: number } {
  const store = getDemoStore();
  let loggedCount = 0;
  let skippedCount = 0;

  for (const pid of patientIds) {
    const patient = store.patients.find((p) => p.id === pid);
    if (!patient || patient.status === "delivered" || patient.status === "closed") {
      skippedCount++;
      continue;
    }

    loggedCount++;
    const contacts = store.contacts[pid] ?? [];
    contacts.unshift({
      id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      channel,
      outcome,
      notes: notes || "Logged via Batch Follow-up",
      created_at: new Date().toISOString(),
    });
    store.contacts[pid] = contacts;
  }

  saveDemoStore(store);
  invalidateDemoCache();
  return { error: null, loggedCount, skippedCount };
}

export function getDemoContactStats(): { reached: number; total: number; successRate: number } {
  const contacts = getDemoContacts();
  const reached = contacts.filter((contact) => contact.outcome === "reached" || contact.outcome === "will_visit").length;
  const total = contacts.length;
  const successRate = total > 0 ? Math.round((reached / total) * 100) : 0;
  return { reached, total, successRate };
}

export function getDemoDeliveriesThisMonthCount(): number {
  const store = getDemoStore();
  const today = todayInClinicTimezone();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  return store.patients.filter(
    (p) => (p.status === "delivered" || p.status === "closed") && p.deliveryDate?.startsWith(currentYearMonth)
  ).length;
}

export function addDemoPatient(data: {
  name: string;
  clinicPatientNo?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  age?: number | null;
  address?: string | null;
  gravida?: number | null;
  para?: number | null;
  bloodGroup?: string | null;
  rhNegative: boolean;
  lmp: string;
  edd?: string | null;
  obstetricQuestionnaire?: import("@/lib/obstetricQuestionnaire").ObstetricQuestionnaireData;
}): string {
  const store = getDemoStore();
  const today = todayInClinicTimezone();
  const lmpDate = parseLocalDate(data.lmp);
  const ga = gestationalAge(lmpDate, today);
  const weeksPregnant = Math.max(0.1, ga.days / 7);

  const cleanName = data.name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") || "patient";
  const id = `p-demo-${cleanName}-${Date.now().toString(36)}`;

  const eddDate = new Date(lmpDate);
  eddDate.setDate(eddDate.getDate() + 280);
  const edd = data.edd || toISODate(eddDate);

  const newPatient: DemoPatientRaw = {
    id,
    name: data.name.trim(),
    clinicPatientNo: data.clinicPatientNo || `ANC-${Math.floor(200 + Math.random() * 800)}`,
    phone: data.phone || null,
    altPhone: data.altPhone || undefined,
    address: data.address || null,
    age: data.age ?? 26,
    gravida: data.gravida ?? 1,
    para: data.para ?? 0,
    bloodGroup: data.bloodGroup || null,
    rhNegative: data.rhNegative,
    weeksPregnant: Number(weeksPregnant.toFixed(1)),
    lmp: data.lmp,
    edd,
    risk: "on_track",
    noAnswerStreak: 0,
    status: "active",
    pregnancyStatus: "active",
    createdAt: new Date().toISOString(),
    obstetricQuestionnaire: data.obstetricQuestionnaire,
    latestVisit: {
      daysAgo: 0,
      bpSys: 120,
      bpDia: 80,
      hb: 12.0,
      fhr: 140,
    },
    overdueEvents: [],
    dueEvents: [
      { name: "Booking visit + Labs", kind: "test", dueInDays: 3 },
      { name: "Dating / Viability scan", kind: "scan", dueInDays: 7 },
    ],
  };

  store.patients.unshift(newPatient);
  saveDemoStore(store);
  invalidateDemoCache();
  return id;
}

export function markDemoCareEventDone(careEventId: string, patientId: string, completedAt?: string): void {
  const store = getDemoStore();
  const current = store.completedEvents[patientId] ?? [];
  if (!current.includes(careEventId)) {
    store.completedEvents[patientId] = [...current, careEventId];
    if (completedAt) {
      const dates = store.completedEventDates ??= {};
      (dates[patientId] ??= {})[careEventId] = completedAt;
    }
  }
  saveDemoStore(store);
  invalidateDemoCache();
}

export function undoDemoCareEvent(careEventId: string, patientId: string): void {
  const store = getDemoStore();
  store.completedEvents[patientId] = (store.completedEvents[patientId] ?? []).filter((id) => id !== careEventId);
  const dates = store.completedEventDates?.[patientId];
  if (dates) delete dates[careEventId];
  saveDemoStore(store);
  invalidateDemoCache();
}

export function recordDemoVisit(
  patientId: string,
  v: {
    visitDate: string;
    bpSys: number | null;
    bpDia: number | null;
    weight: number | null;
    hb: number | null;
    fhr: number | null;
    fundalHeight: number | null;
    notes: string | null;
    nextVisitDate: string | null;
  },
  clientRequestId?: string
): void {
  const store = getDemoStore();
  if (clientRequestId && (store.visits[patientId] ?? []).some((x) => x.client_request_id === clientRequestId)) return;
  const visits = store.visits[patientId] ?? [];
  visits.unshift({
    id: `v-${Date.now().toString(36)}`,
    patient_id: patientId,
    visit_date: v.visitDate,
    bp_sys: v.bpSys,
    bp_dia: v.bpDia,
    weight: v.weight,
    hb: v.hb,
    fhr: v.fhr,
    fundal_height: v.fundalHeight,
    notes: v.notes,
    next_visit_date: v.nextVisitDate,
    created_at: new Date().toISOString(),
    ...(clientRequestId ? { client_request_id: clientRequestId } : {}),
  });
  store.visits[patientId] = visits;
  saveDemoStore(store);
  invalidateDemoCache();
}

export function logDemoContact(
  patientId: string,
  channel: "call" | "whatsapp",
  outcome: ContactOutcome,
  notes?: string,
  clientRequestId?: string
): void {
  const store = getDemoStore();
  if (clientRequestId && (store.contacts[patientId] ?? []).some((x) => x.client_request_id === clientRequestId)) return;
  const contacts = store.contacts[patientId] ?? [];
  contacts.unshift({
    id: `c-${Date.now().toString(36)}`,
    channel,
    outcome,
    notes: notes || null,
    created_at: new Date().toISOString(),
    ...(clientRequestId ? { client_request_id: clientRequestId } : {}),
  });
  store.contacts[patientId] = contacts;
  saveDemoStore(store);
  invalidateDemoCache();
}

export function updateDemoPatient(
  patientId: string,
  updates: Partial<Omit<DemoPatientRaw, "id">>
): boolean {
  const store = getDemoStore();
  const patient = store.patients.find((p) => p.id === patientId);
  if (!patient) return false;
  Object.assign(patient, updates);
  saveDemoStore(store);
  invalidateDemoCache();
  return true;
}

function getDemoPatientContacts(patient: DemoPatientRaw, today: Date): DemoContactRecord[] {
  const contacts = (getDemoStore().contacts[patient.id] ?? []).map((contact): DemoContactRecord =>
    contact.channel === "whatsapp" && contact.outcome === "reached" &&
    (contact.notes === "Automated WhatsApp reminder sent" || /^Automated (reminder sent:|Bot reminder sent \()/.test(contact.notes ?? ""))
      ? { ...contact, outcome: "automated_reminder" }
      : contact,
  );
  const seed = INITIAL_RAW_DEMO_PATIENTS.find((item) => item.id === patient.id);
  const previousDate = (days: number) =>
    toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days));
  if (seed) {
    for (let i = 0; i < seed.noAnswerStreak; i++) {
      contacts.push({
        id: `c-seed-${patient.id}-${i}`, channel: "call", outcome: "no_answer",
        notes: null, created_at: previousDate(i + 3),
      });
    }
  }
  if (patient.id === "p2-sunita-verma") {
    contacts.push({
      id: "c-seed-sunita", channel: "whatsapp", outcome: "reached",
      notes: "Reminder confirmed", created_at: previousDate(2),
    });
  }
  return contacts.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getDemoContacts() {
  const today = todayInClinicTimezone();
  return getDemoStore().patients.flatMap((patient) =>
    getDemoPatientContacts(patient, today).map((contact) => ({
      patientId: patient.id,
      channel: contact.channel,
      outcome: contact.outcome,
      createdAt: contact.created_at,
      notes: contact.notes ?? undefined,
    })),
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDemoDocuments(docType?: string, search?: string) {
  const store = getDemoStore();
  const q = search?.trim().toLowerCase();
  return (store.documents ?? [])
    .filter((d) => {
      if (docType && d.doc_type !== docType) return false;
      if (q) {
        const text = (d.ocr_text ?? "").toLowerCase();
        const type = (d.doc_type ?? "").toLowerCase();
        const src = (d.source ?? "").toLowerCase();
        if (!text.includes(q) && !type.includes(q) && !src.includes(q)) return false;
      }
      return true;
    })
    .map((d) => {
      const patient = d.patient_id ? store.patients.find((p) => p.id === d.patient_id) : null;
      return {
        ...d,
        patients: patient ? { name: patient.name } : null,
      };
    });
}

export function addDemoDocument(data: {
  clinicId?: string;
  folder?: string;
  docType?: string;
  docDate?: string | null;
  source?: string;
  storagePath?: string;
  dataUrl?: string | null;
  ocrText?: string | null;
  ocrStatus?: "pending" | "done" | "failed" | "skipped";
  patientId?: string | null;
}): DemoDocumentRecord {
  const store = getDemoStore();
  if (!store.documents) store.documents = [];
  const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const doc: DemoDocumentRecord = {
    id,
    clinic_id: data.clinicId ?? "demo-clinic-id",
    doc_type: data.docType ?? "other",
    doc_date: data.docDate || null,
    source: data.source ?? "camera",
    storage_path: data.storagePath ?? `demo/${data.folder ?? "inbox"}/${id}.${data.source === "pdf" ? "pdf" : "jpg"}`,
    ocr_status: data.ocrStatus ?? (data.ocrText ? "done" : "skipped"),
    ocr_text: data.ocrText || null,
    created_at: new Date().toISOString(),
    patient_id: data.patientId ?? null,
    data_url: data.dataUrl || null,
  };
  store.documents.unshift(doc);
  saveDemoStore(store);
  invalidateDemoCache();
  return doc;
}

export function updateDemoDocumentOcr(
  documentId: string,
  ocr: { status: "done" | "failed"; text?: string | null; engine?: string | null },
): boolean {
  const store = getDemoStore();
  const doc = store.documents?.find((d) => d.id === documentId);
  if (!doc) return false;
  doc.ocr_status = ocr.status;
  doc.ocr_text = ocr.text || null;
  doc.ocr_engine = ocr.engine ?? null;
  saveDemoStore(store);
  invalidateDemoCache();
  return true;
}

export function assignDemoDocument(
  documentId: string,
  patientId: string,
  docType?: string,
  docDate?: string | null,
  careEventId?: string | null
): boolean {
  const store = getDemoStore();
  if (!store.documents) return false;
  const doc = store.documents.find((d) => d.id === documentId);
  if (!doc) return false;

  doc.patient_id = patientId;
  if (docType) doc.doc_type = docType;
  if (docDate) doc.doc_date = docDate;

  if (careEventId) {
    markDemoCareEventDone(careEventId, patientId);
  }

  saveDemoStore(store);
  invalidateDemoCache();
  return true;
}

export function deleteDemoDocument(documentId: string): { patientId: string | null; docType: string } | null {
  const store = getDemoStore();
  if (!store.documents) return null;
  const idx = store.documents.findIndex((d) => d.id === documentId);
  if (idx === -1) return null;

  const [removed] = store.documents.splice(idx, 1);
  saveDemoStore(store);
  invalidateDemoCache();
  return { patientId: removed.patient_id ?? null, docType: removed.doc_type };
}
