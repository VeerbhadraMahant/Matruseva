import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, WhatsappLogo, FilePdf, Baby } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { gestationalAge, formatGA, trimester } from "@/lib/pregnancy";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { daysBetween, formatDate, formatGravidaPara, formatShortDate, parseLocalDate, relativeDays } from "@/lib/format";
import { bpFlag, hbFlag, fhrFlag, patientFlags, vitalsFlags, sortFlags } from "@/lib/clinical";
import {
  telLink,
  whatsAppLink,
  allLanguageMessages,
  type MessageTemplates,
  type ReminderReason,
} from "@/lib/whatsapp";
import { getCurrentUser } from "@/lib/auth";
import { MarkDoneButton } from "@/components/MarkDoneButton";
import { VisitForm } from "@/components/VisitForm";
import { PregnancyTimeline } from "@/components/PregnancyTimeline";
import { MotherHealthCardButton } from "@/components/MotherHealthCard";
import { ClosePregnancyForm } from "@/components/ClosePregnancyForm";
import { EditPatientButton } from "@/components/EditPatientModal";
import { VitalsTrendCharts } from "@/components/VitalsTrendCharts";
import { PatientDetailInteractive } from "@/components/PatientDetailInteractive";
import { Panel, Tag, Empty, SEVERITY_TONE, buttonPrimary, buttonSecondary, th, td, type Tone } from "@/components/ui";
import type { CareEventStatus, ContactOutcome, FollowUpRisk } from "@/lib/supabase/enums";
import { getDemoPatientDetail } from "@/lib/demo-data";

const STATUS: Record<CareEventStatus, { label: string; tone: Tone }> = {
  done: { label: "Done", tone: "ok" },
  skipped: { label: "Skipped", tone: "neutral" },
  upcoming: { label: "Upcoming", tone: "neutral" },
  due: { label: "Due now", tone: "warning" },
  overdue: { label: "Overdue", tone: "critical" },
};

const RISK: Record<FollowUpRisk, { label: string; tone: Tone }> = {
  on_track: { label: "On track", tone: "ok" },
  at_risk: { label: "At risk", tone: "warning" },
  lost: { label: "Lost to follow-up", tone: "critical" },
};

const OUTCOME: Record<ContactOutcome, string> = {
  reached: "Reached",
  will_visit: "Will visit",
  no_answer: "No answer",
  wrong_number: "Wrong number",
  refused: "Refused",
};

const DOC_TYPE: Record<string, string> = {
  report: "Report",
  scan: "Scan",
  prescription: "Prescription",
  case_paper: "Case paper",
  register_page: "Register page",
  other: "Other",
};

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-r border-b border-[var(--color-border)] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">{label}</p>
      <div className="num mt-0.5 text-[15px] font-medium">{children}</div>
    </div>
  );
}

function Abn({ abnormal, children }: { abnormal: boolean; children: React.ReactNode }) {
  return <span className={abnormal ? "font-semibold text-[var(--color-overdue)]" : ""}>{children}</span>;
}

import type { Database } from "@/lib/supabase/types";

type PatientRecord = Database["public"]["Tables"]["patients"]["Row"];
type VisitRecord = Database["public"]["Tables"]["visits"]["Row"];

interface CareEventRecord {
  id: string;
  name: string;
  kind: string;
  due_from: string;
  due_to: string;
  completed_at: string | null;
  status: CareEventStatus;
}

interface DocRecord {
  id: string;
  doc_type: string;
  doc_date: string | null;
  storage_path: string;
  ocr_text?: string | null;
  created_at: string;
}

interface ContactRecord {
  id: string;
  channel: string;
  outcome: ContactOutcome;
  notes: string | null;
  created_at: string;
}

interface RiskRecord {
  risk: FollowUpRisk;
  next_visit_date: string | null;
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("matrusetu_demo")?.value === "1";
  const [me, supabase] = await Promise.all([getCurrentUser(), createClient()]);

  let patient: PatientRecord | null = null;
  let careEvents: CareEventRecord[] = [];
  let visits: VisitRecord[] = [];
  let documents: DocRecord[] = [];
  let contacts: ContactRecord[] = [];
  let risk: RiskRecord | null = null;

  if (isDemo) {
    const demo = getDemoPatientDetail(id);
    patient = demo.patient as PatientRecord;
    careEvents = demo.careEvents as CareEventRecord[];
    visits = demo.visits.map((v) => ({
      id: v.id,
      patient_id: v.patient_id,
      clinic_id: "00000000-0000-0000-0000-000000000002",
      visit_date: v.visit_date,
      bp_sys: v.bp_sys,
      bp_dia: v.bp_dia,
      hb: v.hb,
      fhr: v.fhr,
      weight: v.weight,
      fundal_height: v.fundal_height,
      ga_weeks: null,
      notes: v.notes,
      next_visit_date: v.next_visit_date,
      created_at: v.created_at,
      created_by: null,
    }));
    documents = demo.documents as DocRecord[];
    contacts = demo.contacts as ContactRecord[];
    risk = demo.risk as RiskRecord;
  } else {
    const [pRes, ceRes, vRes, dRes, cRes, rRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("care_event_status")
        .select("id, name, kind, due_from, due_to, completed_at, status")
        .eq("patient_id", id)
        .order("due_from"),
      supabase
        .from("visits")
        .select("*")
        .eq("patient_id", id)
        .order("visit_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("documents")
        .select("id, doc_type, doc_date, storage_path, ocr_text, created_at")
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_log")
        .select("id, channel, outcome, notes, created_at")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("patient_followup_risk").select("risk, next_visit_date").eq("patient_id", id).maybeSingle(),
    ]);
    patient = pRes.data as PatientRecord | null;
    careEvents = (ceRes.data ?? []) as CareEventRecord[];
    visits = (vRes.data ?? []) as VisitRecord[];
    documents = (dRes.data ?? []) as DocRecord[];
    contacts = (cRes.data ?? []) as ContactRecord[];
    risk = rRes.data as RiskRecord | null;
  }

  if (!patient) notFound();

  const docs = documents ?? [];
  const { data: signed } = (!isDemo && docs.length)
    ? await supabase.storage.from("documents").createSignedUrls(docs.map((d: DocRecord) => d.storage_path), 300)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const patientDocs = docs.map((d) => ({
    id: d.id,
    doc_type: d.doc_type,
    doc_date: d.doc_date,
    storage_path: d.storage_path,
    ocr_text: d.ocr_text ?? null,
    url: urlByPath.get(d.storage_path) ?? null,
    created_at: d.created_at,
  }));

  const today = todayInClinicTimezone();
  const lmp = patient.lmp ? parseLocalDate(patient.lmp) : null;
  const ga = lmp ? gestationalAge(lmp, today) : null;
  const eddIso =
    patient.edd ?? (lmp ? toISODate(new Date(lmp.getFullYear(), lmp.getMonth(), lmp.getDate() + 280)) : null);
  const followUp = RISK[(risk?.risk as FollowUpRisk) ?? "on_track"];
  const nextVisit = risk?.next_visit_date ?? null;

  const events = (careEvents ?? []).map((ce) => ({
    id: ce.id!,
    name: ce.name!,
    kind: ce.kind!,
    dueFrom: ce.due_from!,
    dueTo: ce.due_to!,
    completedAt: ce.completed_at,
    status: ce.status as CareEventStatus,
  }));
  const openCount = events.filter((e) => e.status === "overdue").length;

  const visitList = visits ?? [];
  const latest = visitList[0];
  const flags = sortFlags([
    ...(latest ? vitalsFlags({ bpSys: latest.bp_sys, bpDia: latest.bp_dia, hb: latest.hb, fhr: latest.fhr }) : []),
    ...patientFlags({ age: patient.age, gravida: patient.gravida, rhNegative: patient.rh_negative, bloodGroup: patient.blood_group, gaWeeks: ga?.weeks ?? null }),
  ]);

  const [{ data: clinic }] = await Promise.all([
    supabase.from("clinics").select("name, message_templates").eq("id", patient.clinic_id).single(),
  ]);

  const clinicTemplates = (clinic?.message_templates ?? {}) as MessageTemplates;
  const defaultLang = clinicTemplates.default_lang ?? "en";

  const tel = patient.phone ? telLink(patient.phone) : null;
  const firstOverdue = events.find((e) => e.status === "overdue");
  const reminderReason: ReminderReason = firstOverdue ? "overdue" : "due_soon";
  const messagesByLang = allLanguageMessages(
    patient.name,
    reminderReason,
    firstOverdue?.name,
    clinicTemplates,
    clinic?.name
  );
  const whatsappByLang = {
    en: patient.phone ? whatsAppLink(patient.phone, messagesByLang.en) : null,
    hi: patient.phone ? whatsAppLink(patient.phone, messagesByLang.hi) : null,
    mr: patient.phone ? whatsAppLink(patient.phone, messagesByLang.mr) : null,
  };
  const wa = whatsappByLang[defaultLang];

  return (
    <>
      <header className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-4 pb-3">
          <div>
            <p className="text-[12px] text-[var(--color-charcoal)]">
              <Link href="/patients" className="hover:underline">
                Patients
              </Link>{" "}
              /{patient.clinic_patient_no ? <span className="num"> #{patient.clinic_patient_no}</span> : null}
            </p>
            <h1 className="text-[24px] leading-8">{patient.name}</h1>
            <p className="num text-[13px] text-[var(--color-charcoal)]">
              {[
                patient.age ? `${patient.age} y` : null,
                formatGravidaPara(patient.gravida, patient.para),
                patient.blood_group,
                patient.phone,
                patient.address,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EditPatientButton
              patient={{
                id: patient.id,
                name: patient.name,
                clinicPatientNo: patient.clinic_patient_no,
                age: patient.age,
                phone: patient.phone,
                altPhone: patient.alt_phone,
                address: patient.address,
                gravida: patient.gravida,
                para: patient.para,
                bloodGroup: patient.blood_group,
                rhNegative: patient.rh_negative,
                lmp: patient.lmp,
                edd: patient.edd,
                eddSource: (patient.edd_source as "lmp" | "scan" | "manual") || "lmp",
              }}
            />
            <MotherHealthCardButton
              patient={{
                id: patient.id,
                name: patient.name,
                clinicPatientNo: patient.clinic_patient_no,
                age: patient.age,
                phone: patient.phone,
                altPhone: patient.alt_phone,
                bloodGroup: patient.blood_group,
                rhNegative: patient.rh_negative,
                edd: eddIso ? formatShortDate(eddIso) : null,
                gaLabel: ga ? `${formatGA(ga)} · T${trimester(ga)}` : null,
                gravida: patient.gravida,
                para: patient.para,
                clinicName: me.clinicName,
              }}
            />
            {tel && (
              <a href={tel} className={buttonPrimary}>
                <Phone size={15} weight="fill" aria-hidden /> Call
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className={buttonSecondary}>
                <WhatsappLogo size={15} aria-hidden /> WhatsApp
              </a>
            )}
            {!(patient.status === "delivered" || patient.status === "closed" || patient.pregnancy_status === "delivered" || patient.pregnancy_status === "closed") ? (
              <>
                <a href="#record-visit" className={buttonSecondary}>
                  Record visit
                </a>
                <ClosePregnancyForm
                  patient={{
                    id: patient.id,
                    name: patient.name,
                    clinicPatientNo: patient.clinic_patient_no,
                    lmp: patient.lmp,
                    edd: eddIso,
                  }}
                  todayIso={toISODate(today)}
                />
              </>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-l border-[var(--color-border)] sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Gestational age">
            {(patient.status === "delivered" || patient.status === "closed" || patient.pregnancy_status === "delivered" || patient.pregnancy_status === "closed") ? (
              <span className="font-semibold text-[var(--color-on-track)]">Delivered</span>
            ) : ga ? (
              <>
                {formatGA(ga)} <span className="text-[12px] text-[var(--color-charcoal)]">T{trimester(ga)}</span>
              </>
            ) : (
              "—"
            )}
          </Fact>
          <Fact label="EDD">
            {formatDate(eddIso)}
            {eddIso && <span className="ml-1.5 text-[12px] text-[var(--color-charcoal)]">{relativeDays(eddIso, today)}</span>}
          </Fact>
          <Fact label="LMP">{formatDate(patient.lmp)}</Fact>
          <Fact label="Next visit">
            {(patient.status === "delivered" || patient.status === "closed" || patient.pregnancy_status === "delivered" || patient.pregnancy_status === "closed") ? (
              <span className="text-[var(--color-charcoal)]">Concluded</span>
            ) : nextVisit ? (
              <>
                {formatShortDate(nextVisit)}{" "}
                <span
                  className={`text-[12px] ${
                    daysBetween(today, parseLocalDate(nextVisit)) < 0 ? "text-[var(--color-overdue)]" : "text-[var(--color-charcoal)]"
                  }`}
                >
                  {relativeDays(nextVisit, today)}
                </span>
              </>
            ) : (
              "Not booked"
            )}
          </Fact>
          <Fact label="Follow-up">
            {(patient.status === "delivered" || patient.status === "closed" || patient.pregnancy_status === "delivered" || patient.pregnancy_status === "closed") ? (
              <Tag tone="ok">Delivered</Tag>
            ) : (
              <Tag tone={followUp.tone}>{followUp.label}</Tag>
            )}
          </Fact>
          <Fact label="Schedule">
            {events.filter((e) => e.status === "done").length}/{events.length} done
            {openCount > 0 && <span className="ml-1.5 text-[12px] text-[var(--color-overdue)]">{openCount} overdue</span>}
          </Fact>
        </div>
      </header>

      <div className="space-y-4 p-4 md:p-6 pb-20 md:pb-6">
        {(patient.status === "delivered" || patient.status === "closed" || patient.pregnancy_status === "delivered" || patient.pregnancy_status === "closed") && (
          <div className="border border-[var(--color-on-track)] bg-[var(--color-on-track-surface)] p-4 text-[var(--color-foreground)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-on-track)]/30 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center bg-[var(--color-on-track)] text-white">
                  <Baby size={16} weight="bold" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--color-on-track)] uppercase tracking-wider">
                    Delivery Outcome & Pregnancy Closed
                  </h3>
                  <p className="text-[12px] text-[var(--color-charcoal)]">
                    Active ANC schedule closed on {patient.closed_at ? formatShortDate(patient.closed_at) : (patient.delivery_date ? formatShortDate(patient.delivery_date) : "record")}
                  </p>
                </div>
              </div>
              <Tag tone="ok">Delivered</Tag>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-[13px]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-charcoal)]">Delivery Date</p>
                <p className="font-semibold mt-0.5">{patient.delivery_date ? formatDate(patient.delivery_date) : "Recorded"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-charcoal)]">Delivery Mode</p>
                <p className="font-semibold mt-0.5">{patient.delivery_mode === "LSCS" ? "LSCS (Cesarean Section)" : "NVD (Normal Vaginal Delivery)"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-charcoal)]">Birth Weight</p>
                <p className="font-semibold font-mono mt-0.5">{patient.birth_weight_kg ? `${patient.birth_weight_kg} kg` : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-charcoal)]">Status</p>
                <p className="font-semibold text-[var(--color-on-track)] mt-0.5">Discharged from ANC</p>
              </div>
            </div>
          </div>
        )}
        {flags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">Alerts</span>
            {flags.map((f) => (
              <Tag key={f.code} tone={SEVERITY_TONE[f.severity]}>
                {f.label}
              </Tag>
            ))}
          </div>
        )}

        {lmp && ga && (
          <Panel title="Pregnancy timeline">
            <PregnancyTimeline lmp={patient.lmp!} gaDays={ga.days} events={events} />
          </Panel>
        )}

        <VitalsTrendCharts
          visits={visitList}
          lmp={patient.lmp}
          edd={eddIso}
          patientName={patient.name}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel title="ANC schedule" count={events.length}>
              {events.length === 0 ? (
                <Empty>No schedule generated for this patient.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr>
                        <th className={th}>Item</th>
                        <th className={th}>Window</th>
                        <th className={th}>Status</th>
                        <th className={th}>
                          <span className="sr-only">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e) => (
                        <tr key={e.id} className={e.status === "done" || e.status === "skipped" ? "text-[var(--color-charcoal)]" : ""}>
                          <td className={td}>
                            <p className={e.status === "done" ? "" : "font-medium"}>{e.name}</p>
                            <p className="text-[12px] capitalize text-[var(--color-charcoal)]">{e.kind}</p>
                          </td>
                          <td className={`${td} num whitespace-nowrap text-[13px]`}>
                            {formatShortDate(e.dueFrom)} – {formatShortDate(e.dueTo)}
                          </td>
                          <td className={td}>
                            <Tag tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Tag>
                            {e.status === "done" && e.completedAt && (
                              <span className="num ml-1.5 text-[12px]">{formatShortDate(e.completedAt)}</span>
                            )}
                          </td>
                          <td className={`${td} text-right`}>
                            {e.status !== "done" && e.status !== "skipped" && <MarkDoneButton careEventId={e.id} patientId={id} />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Visits & vitals" count={visitList.length}>
              {visitList.length === 0 ? (
                <Empty>No visits recorded yet.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr>
                        <th className={th}>Date</th>
                        <th className={th}>GA</th>
                        <th className={th}>BP</th>
                        <th className={th}>Wt kg</th>
                        <th className={th}>Hb</th>
                        <th className={th}>FHR</th>
                        <th className={th}>FH cm</th>
                        <th className={th}>Notes</th>
                      </tr>
                    </thead>
                    <tbody className="num">
                      {visitList.map((v, i) => {
                        const prev = visitList[i + 1];
                        const dw = v.weight !== null && prev?.weight != null ? v.weight - prev.weight : null;
                        const vga = lmp ? formatGA(gestationalAge(lmp, parseLocalDate(v.visit_date))) : "—";
                        return (
                          <tr key={v.id}>
                            <td className={`${td} whitespace-nowrap`}>{formatShortDate(v.visit_date)}</td>
                            <td className={`${td} text-[var(--color-charcoal)]`}>{vga}</td>
                            <td className={`${td} whitespace-nowrap`}>
                              {v.bp_sys && v.bp_dia ? (
                                <Abn abnormal={bpFlag(v.bp_sys, v.bp_dia) !== null}>
                                  {v.bp_sys}/{v.bp_dia}
                                </Abn>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className={`${td} whitespace-nowrap`}>
                              {v.weight ?? "—"}
                              {dw !== null && dw !== 0 && (
                                <span className="ml-1 text-[11px] text-[var(--color-charcoal)]">
                                  {dw > 0 ? "+" : ""}
                                  {dw.toFixed(1)}
                                </span>
                              )}
                            </td>
                            <td className={td}>{v.hb ? <Abn abnormal={hbFlag(v.hb) !== null}>{v.hb}</Abn> : "—"}</td>
                            <td className={td}>{v.fhr ? <Abn abnormal={fhrFlag(v.fhr) !== null}>{v.fhr}</Abn> : "—"}</td>
                            <td className={td}>{v.fundal_height ?? "—"}</td>
                            <td className={`${td} min-w-40 font-sans text-[13px]`}>{v.notes ?? ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Record visit" className="scroll-mt-4" >
              <div id="record-visit" className="p-3">
                <PatientDetailInteractive
                  patientId={id}
                  patientName={patient.name}
                  gaLabel={ga ? formatGA(ga) : null}
                  phone={patient.phone}
                  tel={tel}
                  wa={wa}
                  whatsappByLang={whatsappByLang}
                  messagesByLang={messagesByLang}
                  defaultLang={defaultLang}
                  documents={patientDocs}
                />
                <VisitForm patientId={id} />
              </div>
            </Panel>

            <Panel title="Contact history" count={(contacts ?? []).length}>
              {(contacts ?? []).length === 0 ? (
                <Empty>No calls or messages logged.</Empty>
              ) : (
                <ul>
                  {(contacts ?? []).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2 text-[13px] last:border-0">
                      <span>
                        {c.channel === "whatsapp" ? "WhatsApp" : "Call"} ·{" "}
                        <span className="font-medium">{OUTCOME[c.outcome as ContactOutcome] ?? c.outcome}</span>
                      </span>
                      <span className="num text-[12px] text-[var(--color-charcoal)]">
                        {new Date(c.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Documents"
              count={docs.length}
              action={
                <Link href="/documents" className="text-[13px] font-medium text-[var(--color-primary)] hover:underline">
                  Upload →
                </Link>
              }
            >
              {docs.length === 0 ? (
                <Empty>No documents filed yet.</Empty>
              ) : (
                <ul className="grid grid-cols-2 gap-px bg-[var(--color-border)]">
                  {docs.map((doc) => {
                    const url = urlByPath.get(doc.storage_path) ?? null;
                    const isImage = /\.(jpe?g|png|webp)$/i.test(doc.storage_path);
                    return (
                      <li key={doc.id} className="bg-[var(--color-background)]">
                        <a href={url ?? undefined} target="_blank" rel="noreferrer" className="block hover:opacity-90">
                          {url && isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element -- private signed URL, not an optimizable static asset
                            <img src={url} alt="" loading="lazy" className="h-28 w-full object-cover" />
                          ) : (
                            <div className="flex h-28 items-center justify-center bg-[var(--color-surface-1)]">
                              <FilePdf size={32} className="text-[var(--color-charcoal)]" aria-hidden />
                            </div>
                          )}
                          <p className="px-2 py-1.5 text-[12px]">
                            <span className="font-medium">{DOC_TYPE[doc.doc_type] ?? doc.doc_type}</span>{" "}
                            <span className="num text-[var(--color-charcoal)]">
                              {formatShortDate(doc.doc_date ?? doc.created_at)}
                            </span>
                          </p>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
