import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, FilePdf, Baby, FileText, Microphone, DotsThree } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { gestationalAge, formatGALocalized, trimester } from "@/lib/pregnancy";
import { getT } from "@/lib/i18n/server";
import { careEventKind, careEventName, careStatusLabel, contactOutcomeLabel, documentTypeLabel, followUpRiskLabel } from "@/lib/clinicalLabels";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import { daysBetween, formatContactDate, formatDate, formatGravidaPara, formatShortDate, parseLocalDate, relativeDays } from "@/lib/format";
import { bpFlag, hbFlag, fhrFlag, patientFlags, vitalsFlags, sortFlags, localizeFlags } from "@/lib/clinical";
import {
  telLink,
  whatsAppLink,
  allLanguageMessages,
  type MessageTemplates,
  type ReminderReason,
} from "@/lib/whatsapp";
import { getCurrentUser, isDemoActive } from "@/lib/auth";
import { MarkDoneButton } from "@/components/MarkDoneButton";
import { VisitForm } from "@/components/VisitForm";
import { PregnancyTimeline } from "@/components/PregnancyTimeline";
import { MotherHealthCardButton } from "@/components/MotherHealthCard";
import { NutritionDietButton } from "@/components/NutritionDietModal";
import { VoiceCounselorButton } from "@/components/VoiceCounselorModal";
import { ClosePregnancyForm } from "@/components/ClosePregnancyForm";
import { EditPatientButton } from "@/components/EditPatientModal";
import { VitalsTrendCharts } from "@/components/VitalsTrendCharts";
import { PatientDetailInteractive } from "@/components/PatientDetailInteractive";
import { Panel, Tag, Empty, IdentityStrip, ActionBar, SEVERITY_TONE, buttonPrimary, buttonSecondary, card, pageBody, th, td, type Tone } from "@/components/ui";
import type { CareEventStatus, ContactOutcome, FollowUpRisk } from "@/lib/supabase/enums";
import { getDemoPatientDetail } from "@/lib/demo-data";

const STATUS_TONE: Record<CareEventStatus, Tone> = {
  done: "ok",
  skipped: "neutral",
  upcoming: "neutral",
  due: "warning",
  overdue: "critical",
};

const RISK_TONE: Record<FollowUpRisk, Tone> = {
  on_track: "ok",
  at_risk: "warning",
  lost: "critical",
};

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
  const isDemo = isDemoActive(cookieStore);
  const { t, locale } = await getT();
  const [me, supabase] = await Promise.all([getCurrentUser(), isDemo ? null : createClient()]);

  let patient: PatientRecord | null = null;
  let careEvents: CareEventRecord[] = [];
  let visits: VisitRecord[] = [];
  let documents: DocRecord[] = [];
  let contacts: ContactRecord[] = [];
  let risk: RiskRecord | null = null;

  if (isDemo) {
    const demo = getDemoPatientDetail(id);
    patient = demo.patient as unknown as PatientRecord;
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
      client_request_id: null,
    }));
    documents = demo.documents as DocRecord[];
    contacts = demo.contacts as ContactRecord[];
    risk = demo.risk as RiskRecord;
  } else if (supabase) {
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
  const { data: signed } = (supabase && docs.length)
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
  const followUpRisk = (risk?.risk as FollowUpRisk) ?? "on_track";
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
  const alertFlags = localizeFlags(flags, t);

  const { data: clinic } = supabase
    ? await supabase.from("clinics").select("name, message_templates").eq("id", patient.clinic_id).single()
    : { data: null };

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
  const isClosed = ["delivered", "closed"].includes(patient.status) ||
    ["delivered", "closed"].includes(patient.pregnancy_status ?? "");
  const visitWorkspace = (
    <PatientDetailInteractive
      patientId={id}
      patientName={patient.name}
      gaLabel={ga ? formatGALocalized(ga, t) : null}
      wa={wa}
      whatsappByLang={whatsappByLang}
      messagesByLang={messagesByLang}
      defaultLang={defaultLang}
      documents={patientDocs}
    />
  );

  const lastVisitFact = latest ? (
    <>
      {formatShortDate(latest.visit_date, locale)}{" "}
      <span className="text-[12px] font-normal text-[var(--color-charcoal)]">{relativeDays(latest.visit_date, today, locale)}</span>
    </>
  ) : (
    "—"
  );
  const lastVitalsFact =
    latest && (latest.bp_sys || latest.hb) ? (
      <>
        {latest.bp_sys && latest.bp_dia ? (
          <Abn abnormal={bpFlag(latest.bp_sys, latest.bp_dia) !== null}>
            {latest.bp_sys}/{latest.bp_dia}
          </Abn>
        ) : (
          "—"
        )}
        {" · "}
        {latest.hb ? <Abn abnormal={hbFlag(latest.hb) !== null}>{latest.hb}</Abn> : "—"}
      </>
    ) : (
      "—"
    );

  const stripFacts = [
    {
      label: t("patientDetail.fact.ga"),
      value: isClosed ? (
        <span className="text-[var(--color-on-track)]">{t("patientDetail.fact.delivered")}</span>
      ) : ga ? (
        <>
          {formatGALocalized(ga, t)} <span className="text-[12px] font-normal text-[var(--color-charcoal)]">{t("clinical.trimester.short", { n: trimester(ga) })}</span>
        </>
      ) : (
        "—"
      ),
    },
    {
      label: t("patientDetail.fact.edd"),
      value: (
        <>
          {formatDate(eddIso, locale)}
          {eddIso && <span className="ml-1.5 text-[12px] font-normal text-[var(--color-charcoal)]">{relativeDays(eddIso, today, locale)}</span>}
          {patient.lmp && (
            <span className="block text-[12px] font-normal text-[var(--color-charcoal)]">
              {t("patientDetail.fact.lmp")} {formatDate(patient.lmp, locale)}
            </span>
          )}
        </>
      ),
    },
    { label: t("patientDetail.fact.lastVisit"), value: lastVisitFact },
    { label: t("patientDetail.fact.lastVitals"), value: lastVitalsFact },
    {
      label: t("patientDetail.fact.nextVisit"),
      value: isClosed ? (
        <span className="text-[var(--color-charcoal)]">{t("patientDetail.fact.concluded")}</span>
      ) : nextVisit ? (
        <>
          {formatShortDate(nextVisit, locale)}{" "}
          <span
            className={`text-[12px] font-normal ${
              daysBetween(today, parseLocalDate(nextVisit)) < 0 ? "text-[var(--color-overdue)]" : "text-[var(--color-charcoal)]"
            }`}
          >
            {relativeDays(nextVisit, today, locale)}
          </span>
        </>
      ) : (
        t("patientDetail.fact.notBooked")
      ),
    },
  ];

  // Overdue and due first; done and skipped are quieter and listed last.
  const RANK: Record<CareEventStatus, number> = { overdue: 0, due: 1, upcoming: 2, done: 3, skipped: 3 };
  const sortedEvents = [...events].sort((a, b) => RANK[a.status] - RANK[b.status]);
  const activeEvents = sortedEvents.filter((e) => RANK[e.status] < 3);
  const finishedEvents = sortedEvents.filter((e) => RANK[e.status] === 3);
  const renderEvent = (e: (typeof events)[number]) => (
    <li
      key={e.id}
      className={`flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--color-border)]/70 px-4 py-3 first:border-t-0 ${
        RANK[e.status] === 3 ? "text-[var(--color-charcoal)]" : ""
      }`}
    >
      <div className="min-w-0 flex-1 basis-48">
        <p className={RANK[e.status] === 3 ? "text-[14px]" : "text-[14px] font-semibold"}>{careEventName(e.name, t)}</p>
        <p className="num text-[12px] text-[var(--color-charcoal)]">
          {careEventKind(e.kind, t)} · {formatShortDate(e.dueFrom, locale)} – {formatShortDate(e.dueTo, locale)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Tag tone={STATUS_TONE[e.status]}>{careStatusLabel(e.status, t)}</Tag>
        {e.status === "done" && e.completedAt && (
          <span className="num text-[12px]">{formatShortDate(e.completedAt, locale)}</span>
        )}
      </div>
      {(e.status === "due" || e.status === "overdue" || e.status === "done") && (
        <MarkDoneButton careEventId={e.id} patientId={id} todayIso={toISODate(today)} done={e.status === "done"} />
      )}
    </li>
  );

  return (
    <>
      <header className="mx-auto w-full max-w-6xl px-4 pt-5 md:px-8 md:pt-7">
        <nav aria-label={t("patientDetail.breadcrumb.aria")} className="mb-3 text-[13px] text-[var(--color-charcoal)]">
          <Link href="/patients" className="inline-flex min-h-8 items-center font-medium text-[var(--color-primary)] hover:underline">
            {t("patientDetail.breadcrumb.patients")}
          </Link>
          {patient.clinic_patient_no ? <span className="num"> / #{patient.clinic_patient_no}</span> : null}
        </nav>
        <div className="relative">
          <IdentityStrip
            name={patient.name}
            status={
              isClosed ? (
                <Tag tone="ok">{t("patientDetail.fact.delivered")}</Tag>
              ) : (
                <Tag tone={RISK_TONE[followUpRisk]}>{followUpRiskLabel(followUpRisk, t)}</Tag>
              )
            }
            subtitle={
              <span className="num">
                {[
                  patient.age ? t("patientDetail.header.ageYears", { age: patient.age }) : null,
                  formatGravidaPara(patient.gravida, patient.para),
                  patient.blood_group,
                  patient.phone,
                  patient.address,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </span>
            }
            facts={stripFacts}
            actions={
              <>
                {!isClosed && (
                  <a href="#record-visit" className={`${buttonPrimary} max-md:hidden`}>
                    {t("patientDetail.header.recordVisit")}
                  </a>
                )}
                {tel && (
                  <a href={tel} className={buttonSecondary}>
                    <Phone size={15} weight="fill" aria-hidden /> {t("patientDetail.header.call")}
                  </a>
                )}
                <details className="md:relative">
                  <summary className={`${buttonSecondary} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                    <DotsThree size={17} weight="bold" aria-hidden /> {t("patientDetail.header.more")}
                  </summary>
                  <div className={`absolute right-4 z-20 mt-2 flex w-max max-w-[min(20rem,calc(100vw-2rem))] flex-col items-stretch gap-2 p-2 md:right-0 ${card}`}>
                <Link
                  href={`/patients/${patient.id}/report`}
                  className={buttonSecondary}
                  title={t("patientDetail.header.reportTitle")}
                >
                  <FileText size={16} weight="bold" className="text-[var(--color-primary)]" aria-hidden />
                  <span>{t("patientDetail.header.report")}</span>
                </Link>
                <Link href={`/patients/${patient.id}/consult`} className={buttonSecondary} title={t("consult.openTitle")}>
                  <Microphone size={16} weight="bold" className="text-[var(--color-primary)]" aria-hidden />
                  <span>{t("consult.open")}</span>
                </Link>
                <VoiceCounselorButton
                  data={{
                    patientId: patient.id,
                    patientName: patient.name,
                    phone: patient.phone,
                    age: patient.age,
                    gaWeeks: ga?.weeks ?? null,
                    trimester: (ga ? trimester(ga) : 2) as 1 | 2 | 3,
                    bpSys: latest?.bp_sys ?? null,
                    bpDia: latest?.bp_dia ?? null,
                    hb: latest?.hb ?? null,
                    fhr: latest?.fhr ?? null,
                    riskFlags: flags.map((f) => f.label),
                    nextVisitDate: firstOverdue?.dueFrom ?? null,
                    clinicName: me.clinicName,
                  }}
                />
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
                    edd: eddIso ? formatShortDate(eddIso, locale) : null,
                    gaLabel: ga ? `${formatGALocalized(ga, t)} · ${t("clinical.trimester.short", { n: trimester(ga) })}` : null,
                    gravida: patient.gravida,
                    para: patient.para,
                    clinicName: me.clinicName,
                  }}
                />
                <NutritionDietButton
                  data={{
                    patientId: patient.id,
                    patientName: patient.name,
                    phone: patient.phone,
                    gaWeeks: ga?.weeks ?? null,
                    trimester: (ga ? trimester(ga) : 2) as 1 | 2 | 3,
                    hb: latest?.hb ?? null,
                    clinicName: me.clinicName,
                  }}
                />
                {visitWorkspace}
                    {!isClosed && (
                      <div className="mt-1 border-t border-[var(--color-border)] pt-3">
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
                      </div>
                    )}
                  </div>
                </details>
              </>
            }
          />
        </div>
      </header>

      <div className={`${pageBody} max-md:pb-28`}>
        {flags.length > 0 && (
          <section aria-label={t("patientDetail.alerts.title")} className={`flex flex-wrap items-center gap-2 px-4 py-3 ${card}`}>
            <h2 className="mr-1 text-[13px] font-semibold text-[var(--color-foreground)]">{t("patientDetail.alerts.title")}</h2>
            {alertFlags.map((f) => (
              <Tag key={f.code} tone={SEVERITY_TONE[f.severity]}>
                {f.label}
              </Tag>
            ))}
          </section>
        )}
        {isClosed && (
          <div className="rounded-[var(--radius-cards)] border border-[var(--color-on-track)]/40 bg-[var(--color-on-track-surface)] p-5 text-[var(--color-foreground)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-on-track)]/30 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-on-track)] text-white">
                  <Baby size={16} weight="bold" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[var(--color-on-track)]">
                    {t("patientDetail.closed.title")}
                  </h2>
                  <p className="text-[12px] text-[var(--color-charcoal)]">
                    {patient.closed_at || patient.delivery_date
                      ? t("patientDetail.closed.closedOn", { date: formatShortDate(patient.closed_at ?? patient.delivery_date, locale) })
                      : t("patientDetail.closed.closedOnRecord")}
                  </p>
                </div>
              </div>
              <Tag tone="ok">{t("patientDetail.fact.delivered")}</Tag>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-[13px]">
              <div>
                <p className="text-[12px] font-medium text-[var(--color-charcoal)]">{t("patientDetail.closed.deliveryDate")}</p>
                <p className="font-semibold mt-0.5">{patient.delivery_date ? formatDate(patient.delivery_date, locale) : t("patientDetail.closed.recorded")}</p>
              </div>
              <div>
                <p className="text-[12px] font-medium text-[var(--color-charcoal)]">{t("patientDetail.closed.deliveryMode")}</p>
                <p className="font-semibold mt-0.5">{patient.delivery_mode === "LSCS" ? t("clinical.delivery.LSCS") : t("clinical.delivery.NVD")}</p>
              </div>
              <div>
                <p className="text-[12px] font-medium text-[var(--color-charcoal)]">{t("patientDetail.closed.birthWeight")}</p>
                <p className="num font-semibold mt-0.5">{patient.birth_weight_kg ? `${patient.birth_weight_kg} kg` : "—"}</p>
              </div>
              <div>
                <p className="text-[12px] font-medium text-[var(--color-charcoal)]">{t("patientDetail.closed.status")}</p>
                <p className="font-semibold text-[var(--color-on-track)] mt-0.5">{t("patientDetail.closed.discharged")}</p>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <Panel
              title={t("patientDetail.panel.schedule")}
              count={events.length}
              action={
                <span className="flex items-center gap-2">
                  <span className="num text-[12px] text-[var(--color-charcoal)]">
                    {t("patientDetail.fact.scheduleDone", { done: events.filter((e) => e.status === "done").length, total: events.length })}
                  </span>
                  {openCount > 0 && <Tag tone="critical">{t("patientDetail.fact.scheduleOverdue", { count: openCount })}</Tag>}
                </span>
              }
            >
              {events.length === 0 ? (
                <Empty>{t("patientDetail.schedule.empty")}</Empty>
              ) : (
                <>
                  {activeEvents.length > 0 && <ul>{activeEvents.map(renderEvent)}</ul>}
                  {finishedEvents.length > 0 && (
                    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-1)]">
                      <h3 className="px-4 pt-3 text-[12px] font-semibold text-[var(--color-charcoal)]">
                        {t("patientDetail.schedule.completed")}
                      </h3>
                      <ul>{finishedEvents.map(renderEvent)}</ul>
                    </div>
                  )}
                </>
              )}
            </Panel>

            <section id="record-visit" tabIndex={-1} className={`scroll-mt-20 ${card}`}>
              <div className="flex min-h-12 items-center border-b border-[var(--color-border)]/70 px-4">
                <h2 className="text-[15px] font-semibold">{t("patientDetail.panel.recordVisit")}</h2>
              </div>
              <div className="p-4">
                <VisitForm patientId={id} />
              </div>
            </section>

            {lmp && ga && (
              <Panel title={t("patientDetail.panel.timeline")}>
                <PregnancyTimeline lmp={patient.lmp!} gaDays={ga.days} events={events} />
              </Panel>
            )}

            <Panel title={t("patientDetail.panel.visits")} count={visitList.length}>
              {visitList.length === 0 ? (
                <Empty>{t("patientDetail.visits.empty")}</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr>
                        <th className={th}>{t("common.date")}</th>
                        <th className={th}>GA</th>
                        <th className={th}>BP</th>
                        <th className={th}>{t("patientDetail.visits.weightKg")}</th>
                        <th className={th}>Hb</th>
                        <th className={th}>FHR</th>
                        <th className={th}>{t("patientDetail.visits.fundalCm")}</th>
                        <th className={th}>{t("common.notes")}</th>
                      </tr>
                    </thead>
                    <tbody className="num">
                      {visitList.map((v, i) => {
                        const prev = visitList[i + 1];
                        const dw = v.weight !== null && prev?.weight != null ? v.weight - prev.weight : null;
                        const vga = lmp ? formatGALocalized(gestationalAge(lmp, parseLocalDate(v.visit_date)), t) : "—";
                        return (
                          <tr key={v.id}>
                            <td className={`${td} whitespace-nowrap`}>{formatShortDate(v.visit_date, locale)}</td>
                            <td className={`${td} whitespace-nowrap text-[var(--color-charcoal)]`}>{vga}</td>
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
                            <td className={`${td} min-w-40 text-[13px]`}>{v.notes ?? ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div className="grid min-w-0 content-start gap-5 md:grid-cols-2 lg:grid-cols-1">
            <div className="min-w-0 md:col-span-2 lg:col-span-1">
              <VitalsTrendCharts visits={visitList} lmp={patient.lmp} edd={eddIso} patientName={patient.name} />
            </div>
            <Panel title={t("patientDetail.panel.contacts")} count={(contacts ?? []).length}>
              {(contacts ?? []).length === 0 ? (
                <Empty>{t("patientDetail.contacts.empty")}</Empty>
              ) : (
                <ul>
                  {(contacts ?? []).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 border-t border-[var(--color-border)]/70 px-4 py-3 text-[13px]">
                      <span>
                        {c.channel === "whatsapp" ? t("clinical.channel.whatsapp") : t("clinical.channel.call")} ·{" "}
                        <span className="font-medium">{contactOutcomeLabel(c.outcome as ContactOutcome, t)}</span>
                      </span>
                      <time dateTime={c.created_at} className="num text-[12px] text-[var(--color-charcoal)]">
                        {formatContactDate(c.created_at, locale)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title={t("patientDetail.panel.documents")}
              count={docs.length}
              action={
                <Link href="/documents" className="text-[13px] font-medium text-[var(--color-primary)] hover:underline">
                  {t("patientDetail.documents.upload")}
                </Link>
              }
            >
              {docs.length === 0 ? (
                <Empty>{t("patientDetail.documents.empty")}</Empty>
              ) : (
                <ul className="grid grid-cols-2 gap-3 p-4 pt-1">
                  {docs.map((doc) => {
                    const url = urlByPath.get(doc.storage_path) ?? null;
                    const isImage = /\.(jpe?g|png|webp)$/i.test(doc.storage_path);
                    return (
                      <li key={doc.id} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]">
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
                            <span className="font-medium">{documentTypeLabel(doc.doc_type, t)}</span>{" "}
                            <span className="num text-[var(--color-charcoal)]">
                              {formatShortDate(doc.doc_date ?? doc.created_at, locale)}
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

      {!isClosed && (
        <div className="md:hidden">
          <ActionBar>
            <a href="#record-visit" className={buttonPrimary}>
              {t("patientDetail.header.recordVisit")}
            </a>
          </ActionBar>
        </div>
      )}
    </>
  );
}
