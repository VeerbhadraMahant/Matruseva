"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Printer,
  ShareNetwork,
  ArrowLeft,
  Heartbeat,
  ShieldWarning,
  CheckCircle,
  FileText,
  MagnifyingGlassPlus,
  PhoneCall,
  Calendar,
  Baby,
  UsersThree,
  FirstAid,
} from "@phosphor-icons/react";
import type { PastObstetricHistory, FamilyPregnancyHistory, DiagnosticScanReport } from "@/lib/obstetricReportData";
import { VoiceCounselorButton } from "@/components/VoiceCounselorModal";
import { OverlayShell } from "@/components/OverlayShell";
import { ActionBar, Tag, buttonPrimary, buttonSecondary } from "@/components/ui";
import { useLocale, useT } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/format";
import { careEventName, careStatusLabel } from "@/lib/clinicalLabels";

export interface ReportVisit {
  visitDate: string;
  gaWeeks?: string | null;
  bpSys: number | null;
  bpDia: number | null;
  weight: number | null;
  weightChange?: number | null;
  hb: number | null;
  fhr: number | null;
  fundalHeight: number | null;
  notes: string | null;
}

export interface ReportCareEvent {
  name: string;
  kind: string;
  status: "done" | "due" | "overdue" | "upcoming";
  completedAt?: string | null;
  dueTo?: string;
}

export interface OnePagePatientReportProps {
  patient: {
    id: string;
    clinicPatientNo?: string | null;
    name: string;
    age?: number | null;
    phone?: string | null;
    altPhone?: string | null;
    address?: string | null;
    bloodGroup?: string | null;
    rhNegative: boolean;
    lmp: string | null;
    edd: string | null;
    gaWeeks: number | null;
    gaDaysRemainder: number | null;
    trimester: number | null;
    gravida: number | null;
    para: number | null;
    risk: "on_track" | "at_risk" | "lost";
    clinicName?: string;
    ashaName?: string;
    ashaPhone?: string;
  };
  pastHistory: PastObstetricHistory;
  familyHistory: FamilyPregnancyHistory;
  scans: DiagnosticScanReport[];
  visits: ReportVisit[];
  careEvents: ReportCareEvent[];
  riskFlags: string[];
}

const lab = "block text-[12px] text-[var(--color-charcoal)] print:text-[10px]";
const val = "text-[14px] font-semibold text-[var(--color-foreground)] print:text-[11px]";
const tile = "rounded-[var(--radius-buttons)] bg-[var(--color-surface-1)] p-2.5 print:p-1.5";
const TXT_CRIT = "text-[var(--color-overdue)] font-bold";
const TXT_WARN = "text-[var(--color-due)] font-bold";
const TXT_OK = "text-[var(--color-on-track)]";

function Section({
  icon,
  title,
  aside,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="break-inside-avoid border-t border-[var(--color-border)] pt-4 print:pt-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 print:mb-1.5">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold print:text-[12px]">
          <span className="shrink-0 text-[var(--color-primary)]" aria-hidden>
            {icon}
          </span>
          {title}
        </h2>
        {aside && <span className="text-[13px] text-[var(--color-charcoal)] print:text-[10px]">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
  return (
    <div className={tile}>
      <dt className={lab}>{label}</dt>
      <dd className="num mt-0.5 text-[18px] font-semibold leading-tight print:text-[13px]">
        {children}
        {unit && <span className="ml-1 text-[12px] font-normal text-[var(--color-charcoal)] print:text-[9px]">{unit}</span>}
      </dd>
    </div>
  );
}

export function OnePagePatientReport({
  patient,
  pastHistory,
  familyHistory,
  scans,
  visits,
  careEvents,
  riskFlags,
}: OnePagePatientReportProps) {
  const t = useT();
  const locale = useLocale();
  const d = (iso: string | null | undefined) => (iso ? formatDate(iso, locale) : "—");
  const [selectedScan, setSelectedScan] = useState<DiagnosticScanReport | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // Fallback
      }
    }
  };

  const latestVisit = visits[0];
  const isHighRisk = patient.risk !== "on_track" || patient.rhNegative || riskFlags.length > 0;
  const bpTone = (sys?: number | null, dia?: number | null) =>
    sys && (sys >= 140 || (dia && dia >= 90)) ? TXT_CRIT : sys && sys >= 130 ? TXT_WARN : "";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-24 pt-5 text-[var(--color-foreground)] md:px-8 md:pb-12 md:pt-7 print:m-0 print:max-w-none print:space-y-0 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/patients/${patient.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-[var(--color-charcoal)] hover:text-[var(--color-primary)]"
        >
          <ArrowLeft size={18} aria-hidden />
          <span>{t("reports.dossier.back")}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <VoiceCounselorButton
            variant="secondary"
            label={t("reports.dossier.audioCounselling")}
            data={{
              patientId: patient.id,
              patientName: patient.name,
              phone: patient.phone,
              age: patient.age,
              gaWeeks: patient.gaWeeks,
              trimester: (patient.trimester as 1 | 2 | 3) || 2,
              bpSys: latestVisit?.bpSys ?? null,
              bpDia: latestVisit?.bpDia ?? null,
              hb: latestVisit?.hb ?? null,
              fhr: latestVisit?.fhr ?? null,
              riskFlags: riskFlags,
              clinicName: patient.clinicName,
            }}
          />
          <span className="hidden md:contents">
            <button type="button" onClick={handleShare} className={buttonSecondary} aria-live="polite">
              <ShareNetwork size={16} aria-hidden />
              <span>{copied ? t("reports.dossier.linkCopied") : t("reports.dossier.shareLink")}</span>
            </button>
            <button type="button" onClick={handlePrint} className={buttonPrimary}>
              <Printer size={16} weight="bold" aria-hidden />
              <span>{t("reports.dossier.print")}</span>
            </button>
          </span>
        </div>
      </div>

      <article className="space-y-5 rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)] md:p-8 print:space-y-3 print:rounded-none print:border-none print:p-0 print:shadow-none">
        <header className="space-y-3 print:space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b-2 border-[var(--color-primary)] pb-3 print:pb-1.5">
            <div>
              <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold tracking-[0.06em] text-[var(--color-primary)] print:text-[12px]">
                MATRUSETU
                <span className="rounded border border-[var(--color-border)] px-1.5 text-[11px] font-semibold tracking-wide text-[var(--color-charcoal)]">PMSMA / FRU</span>
              </p>
              <p className="text-[15px] font-semibold print:text-[12px]">{t("reports.dossier.heading")}</p>
              <p className="text-[13px] text-[var(--color-charcoal)] print:text-[10px]">
                {t("reports.dossier.subtitle", { clinic: patient.clinicName || t("reports.dossier.defaultClinic") })}
              </p>
            </div>
            <p className="num text-[13px] text-[var(--color-charcoal)] print:text-[10px]">
              RCH/OPD: <span className="font-semibold text-[var(--color-foreground)]">{patient.clinicPatientNo || "ANC-REG"}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-balance text-[24px] font-semibold leading-tight tracking-[-0.015em] print:text-[18px]">{patient.name}</h1>
            <Tag tone={isHighRisk ? "critical" : "ok"}>{isHighRisk ? t("reports.dossier.hrp") : t("reports.dossier.routine")}</Tag>
          </div>
          <p className="-mt-2 text-[14px] text-[var(--color-charcoal)] print:text-[11px]">
            <span className="num">
              {patient.age ? t("patientDetail.header.ageYears", { age: patient.age }) : "—"} · G{patient.gravida ?? 1}P{patient.para ?? 0}
            </span>
          </p>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-[var(--radius-buttons)] bg-[var(--color-surface-1)] p-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5 print:gap-y-1.5 print:p-2">
            <div>
              <dt className={lab}>{t("reports.dossier.bloodGroup")}</dt>
              <dd className={`${val} ${patient.rhNegative ? TXT_CRIT : ""}`}>
                {patient.bloodGroup || t("common.unknown")}
                {patient.rhNegative && ` ${t("reports.dossier.rhNeg")}`}
              </dd>
            </div>
            <div>
              <dt className={lab}>{t("reports.dossier.ga")}</dt>
              <dd className={`${val} num`}>
                {patient.gaWeeks !== null ? t("clinical.ga.full", { weeks: patient.gaWeeks, days: patient.gaDaysRemainder ?? 0 }) : "—"}
                {patient.trimester && ` (${t("clinical.trimester.short", { n: patient.trimester })})`}
              </dd>
            </div>
            <div>
              <dt className={lab}>{t("reports.dossier.edd")}</dt>
              <dd className={`${val} num`}>{d(patient.edd)}</dd>
            </div>
            <div>
              <dt className={lab}>{t("reports.dossier.lmp")}</dt>
              <dd className={`${val} num`}>{d(patient.lmp)}</dd>
            </div>
            <div>
              <dt className={lab}>{t("reports.dossier.phone")}</dt>
              <dd className={`${val} num`}>{patient.phone || "—"}</dd>
            </div>
          </dl>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 print:grid-cols-2 print:gap-4">
          <Section icon={<Baby size={18} />} title={t("reports.dossier.s1")}>
            <dl className="mb-3 grid grid-cols-2 gap-2 print:mb-1.5 print:gap-1">
              <div className={tile}>
                <dt className={lab}>{t("reports.dossier.prevMode")}</dt>
                <dd className={val}>
                  {pastHistory.previousDeliveryMode === "LSCS" ? (
                    <span className="text-[var(--color-due)]">{t("reports.dossier.prevLscs")}</span>
                  ) : pastHistory.previousDeliveryMode === "NVD" ? (
                    t("clinical.delivery.NVD")
                  ) : pastHistory.previousDeliveryMode === "None (Primi)" ? (
                    t("reports.dossier.primi")
                  ) : pastHistory.previousDeliveryMode.startsWith("Assisted") ? (
                    t("reports.dossier.assisted")
                  ) : (
                    pastHistory.previousDeliveryMode
                  )}
                </dd>
              </div>
              <div className={tile}>
                <dt className={lab}>{t("reports.dossier.pastComplications")}</dt>
                <dd className={val}>
                  {pastHistory.pastPreEclampsia || pastHistory.pastGDM || pastHistory.pastPPH ? (
                    <span className="text-[var(--color-overdue)]">
                      {[
                        pastHistory.pastPreEclampsia && "Pre-eclampsia",
                        pastHistory.pastGDM && t("reports.dossier.gdm"),
                        pastHistory.pastPPH && "PPH",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  ) : (
                    <span className={TXT_OK}>{t("reports.dossier.noneReported")}</span>
                  )}
                </dd>
              </div>
              <div className={tile}>
                <dt className={lab}>{t("reports.dossier.pastMiscarriages")}</dt>
                <dd className={`${val} num ${pastHistory.pastMiscarriages > 0 ? "text-[var(--color-due)]" : ""}`}>
                  {pastHistory.pastMiscarriages > 0 ? t("reports.dossier.abortions", { count: pastHistory.pastMiscarriages }) : t("reports.dossier.nilZero")}
                  {pastHistory.pastStillbirths > 0 && ` · ${t("reports.dossier.stillbirths", { count: pastHistory.pastStillbirths })}`}
                </dd>
              </div>
              <div className={tile}>
                <dt className={lab}>{t("reports.dossier.interval")}</dt>
                <dd className={`${val} num`}>
                  {pastHistory.interPregnancyMonths ? t("common.unit.month", { count: pastHistory.interPregnancyMonths }) : t("reports.dossier.firstPreg")}
                </dd>
              </div>
            </dl>
            <p className="text-[13px] leading-relaxed print:text-[10px]">
              <span className="font-semibold">{t("reports.dossier.clinicalNote")}</span>
              {pastHistory.notes}
            </p>
          </Section>

          <Section icon={<UsersThree size={18} />} title={t("reports.dossier.s2")}>
            <dl className="mb-3 grid grid-cols-2 gap-2 print:mb-1.5 print:gap-1">
              <div className={tile}>
                <dt className={lab}>{t("reports.dossier.famPih")}</dt>
                <dd className={val}>
                  {familyHistory.familyPreEclampsia ? <span className="text-[var(--color-overdue)]">{t("reports.dossier.famPihYes")}</span> : t("reports.dossier.famPihNo")}
                </dd>
              </div>
              <div className={tile}>
                <dt className={lab}>{t("reports.dossier.famDiabetes")}</dt>
                <dd className={val}>
                  {familyHistory.familyDiabetes ? <span className="text-[var(--color-due)]">{t("reports.dossier.famDiabetesYes")}</span> : t("reports.dossier.negative")}
                </dd>
              </div>
              <div className={tile}>
                <dt className={lab}>{t("reports.dossier.twins")}</dt>
                <dd className={val}>
                  {familyHistory.familyTwins ? <span className="text-[var(--color-info)]">{t("reports.dossier.twinsYes")}</span> : t("reports.dossier.no")}
                </dd>
              </div>
              <div className={tile}>
                <dt className={lab}>{t("reports.dossier.genetic")}</dt>
                <dd className={val}>
                  {familyHistory.familyGeneticAnomalies ? <span className="text-[var(--color-overdue)]">{t("reports.dossier.geneticFlag")}</span> : t("reports.dossier.nilReported")}
                </dd>
              </div>
            </dl>
            <p className="text-[13px] leading-relaxed print:text-[10px]">
              <span className="font-semibold">{t("reports.dossier.familialRisk")}</span>
              {familyHistory.notes}
            </p>
          </Section>
        </div>

        <Section
          icon={<Heartbeat size={18} />}
          title={t("reports.dossier.s3")}
          aside={
            latestVisit && (
              <>
                {t("reports.dossier.latestVisit")} <span className="num font-semibold text-[var(--color-foreground)]">{d(latestVisit.visitDate)}</span>
              </>
            )
          }
        >
          <dl className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 print:mb-1.5 print:grid-cols-6 print:gap-1">
            <Tile label={t("reports.dossier.bp")} unit="mmHg">
              <span className={bpTone(latestVisit?.bpSys, latestVisit?.bpDia)}>
                {latestVisit?.bpSys && latestVisit?.bpDia ? `${latestVisit.bpSys}/${latestVisit.bpDia}` : "—"}
              </span>
            </Tile>
            <Tile label={t("reports.dossier.hb")} unit="g/dL">
              <span className={latestVisit?.hb && latestVisit.hb < 7.0 ? TXT_CRIT : latestVisit?.hb && latestVisit.hb < 11.0 ? TXT_WARN : ""}>
                {latestVisit?.hb ? `${latestVisit.hb}` : "—"}
              </span>
            </Tile>
            <Tile label={t("reports.dossier.weight")} unit="kg">
              {latestVisit?.weight ? `${latestVisit.weight}` : "—"}
            </Tile>
            <Tile label={t("reports.dossier.fhr")} unit="bpm">
              <span className={latestVisit?.fhr && (latestVisit.fhr < 110 || latestVisit.fhr > 160) ? TXT_CRIT : ""}>
                {latestVisit?.fhr ? `${latestVisit.fhr}` : "—"}
              </span>
            </Tile>
            <Tile label={t("reports.dossier.fundal")} unit="cm">
              {latestVisit?.fundalHeight ? `${latestVisit.fundalHeight}` : "—"}
            </Tile>
            <Tile label={t("reports.dossier.urine")} unit={t("reports.dossier.dipstick")}>
              {t("reports.dossier.nilNil")}
            </Tile>
          </dl>

          {visits.length > 0 && (
            <div className="overflow-x-auto rounded-[var(--radius-buttons)] border border-[var(--color-border)]">
              <table className="w-full text-left text-[13px] print:text-[10px]">
                <thead className="bg-[var(--color-surface-1)] text-[12px] text-[var(--color-charcoal)] print:text-[9px]">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold print:py-1">{t("common.date")}</th>
                    <th scope="col" className="px-2 py-2 font-semibold print:py-1">GA</th>
                    <th scope="col" className="px-2 py-2 font-semibold print:py-1">{t("reports.dossier.thBp")}</th>
                    <th scope="col" className="px-2 py-2 font-semibold print:py-1">{t("reports.dossier.thWeight")}</th>
                    <th scope="col" className="px-2 py-2 font-semibold print:py-1">{t("reports.dossier.thHb")}</th>
                    <th scope="col" className="px-2 py-2 font-semibold print:py-1">{t("reports.dossier.thFhr")}</th>
                    <th scope="col" className="px-2 py-2 font-semibold print:py-1">{t("reports.dossier.thFh")}</th>
                    <th scope="col" className="px-3 py-2 font-semibold print:py-1">{t("reports.dossier.thRemarks")}</th>
                  </tr>
                </thead>
                <tbody className="num divide-y divide-[var(--color-border)]/70">
                  {visits.slice(0, 4).map((v, idx) => (
                    <tr key={idx}>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold print:py-1">{d(v.visitDate)}</td>
                      <td className="whitespace-nowrap px-2 py-2 print:py-1">{v.gaWeeks || "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 print:py-1">
                        {v.bpSys && v.bpDia ? <span className={bpTone(v.bpSys, v.bpDia)}>{v.bpSys}/{v.bpDia}</span> : "—"}
                      </td>
                      <td className="px-2 py-2 print:py-1">{v.weight ?? "—"}</td>
                      <td className="px-2 py-2 print:py-1">{v.hb ? <span className={v.hb < 11.0 ? TXT_WARN : ""}>{v.hb}</span> : "—"}</td>
                      <td className="px-2 py-2 print:py-1">{v.fhr ?? "—"}</td>
                      <td className="px-2 py-2 print:py-1">{v.fundalHeight ?? "—"}</td>
                      <td className="max-w-44 break-words px-3 py-2 font-sans print:py-1">{v.notes || t("reports.dossier.routineFollowup")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section icon={<FileText size={18} />} title={t("reports.dossier.s4")} aside={<span className="print:hidden">{t("reports.dossier.scanHint")}</span>}>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-2">
            {scans.map((scan) => (
              <li key={scan.id}>
                <button
                  type="button"
                  onClick={() => setSelectedScan(scan)}
                  className="group block w-full overflow-hidden rounded-[var(--radius-buttons)] border border-[var(--color-border)] text-left hover:border-[var(--color-primary)] print:pointer-events-none"
                >
                  <div className="relative h-28 w-full overflow-hidden bg-[var(--color-pc-ink)] print:h-20">
                    <div dangerouslySetInnerHTML={{ __html: scan.svgImage }} className="h-full w-full" />
                    <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-[var(--color-pc-ink)]/80 px-1.5 py-0.5 text-[12px] font-medium text-white print:hidden">
                      <MagnifyingGlassPlus size={14} aria-hidden /> {t("reports.dossier.inspect")}
                    </span>
                  </div>
                  <div className="space-y-1.5 p-2.5 print:p-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 text-[14px] font-semibold print:text-[10px]">{scan.title}</h3>
                      <span className="num shrink-0 text-[12px] text-[var(--color-charcoal)] print:text-[9px]">{d(scan.date)}</span>
                    </div>
                    <p className="line-clamp-2 text-[13px] leading-relaxed text-[var(--color-charcoal)] print:text-[9px]">{scan.findings}</p>
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)]/70 pt-1.5">
                      {scan.keyMetrics.slice(0, 3).map((metric, mIdx) => (
                        <span
                          key={mIdx}
                          className={`num rounded px-1.5 py-0.5 text-[12px] print:text-[9px] ${
                            metric.alert ? "bg-[var(--color-overdue-surface)] font-bold text-[var(--color-overdue)]" : "bg-[var(--color-surface-1)]"
                          }`}
                        >
                          <span className="text-[var(--color-charcoal)]">{metric.label}: </span>
                          {metric.value}
                          {metric.unit && ` ${metric.unit}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Section>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 print:grid-cols-2 print:gap-4">
          <Section icon={<Calendar size={18} />} title={t("reports.dossier.s5")}>
            <ul className="space-y-1.5 print:space-y-1">
              {careEvents.slice(0, 5).map((ce, cIdx) => (
                <li key={cIdx} className="flex items-center justify-between gap-2 rounded-[var(--radius-buttons)] bg-[var(--color-surface-1)] px-2.5 py-1.5 text-[14px] print:text-[10px]">
                  <span className="font-medium">{careEventName(ce.name, t)}</span>
                  <Tag tone={ce.status === "done" ? "ok" : ce.status === "overdue" ? "critical" : "warning"}>
                    {ce.status === "done" ? t("clinical.status.completed") : ce.status === "overdue" ? careStatusLabel("overdue", t) : t("clinical.status.dueSoon")}
                  </Tag>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={<FirstAid size={18} />} title={t("reports.dossier.s6")}>
            {riskFlags.length > 0 || isHighRisk ? (
              <div className="space-y-2">
                <div className="rounded-[var(--radius-buttons)] bg-[var(--color-overdue-surface)] p-3 text-[14px] print:p-1.5 print:text-[10px]">
                  <p className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--color-overdue)]">
                    <ShieldWarning size={16} weight="fill" aria-hidden />
                    <span>{t("reports.dossier.activeFlags")}</span>
                  </p>
                  <ul className="list-inside list-disc space-y-0.5">
                    {riskFlags.map((flag, fIdx) => (
                      <li key={fIdx}>{flag}</li>
                    ))}
                    {pastHistory.previousDeliveryMode === "LSCS" && <li>{t("reports.dossier.prevCs")}</li>}
                    {patient.rhNegative && <li>{t("reports.dossier.rhNegAdvice")}</li>}
                  </ul>
                </div>
                <p className="rounded-[var(--radius-buttons)] bg-[var(--color-on-track-surface)] p-2.5 text-[13px] print:p-1.5 print:text-[9px]">
                  <span className="font-semibold">{t("reports.dossier.pmsma")}</span>
                  {t("reports.dossier.pmsmaBody")}
                </p>
              </div>
            ) : (
              <div className="rounded-[var(--radius-buttons)] bg-[var(--color-on-track-surface)] p-4 text-center">
                <CheckCircle size={24} weight="fill" className="mx-auto mb-1.5 text-[var(--color-on-track)]" aria-hidden />
                <p className="text-[14px] font-semibold">{t("reports.dossier.lowRisk")}</p>
                <p className="mt-0.5 text-[13px] text-[var(--color-charcoal)]">{t("reports.dossier.lowRiskBody")}</p>
              </div>
            )}
          </Section>
        </div>

        <footer className="break-inside-avoid border-t border-[var(--color-border)] pt-4 text-[13px] text-[var(--color-charcoal)] print:pt-2 print:text-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-buttons)] bg-[var(--color-overdue-surface)] px-2.5 py-1 font-semibold text-[var(--color-overdue)]">
                <PhoneCall size={16} weight="bold" aria-hidden />
                {t("reports.dossier.hotline")}
              </span>
              <span>
                {t("reports.dossier.asha")} <span className="font-semibold text-[var(--color-foreground)]">{patient.ashaName || "Rekha Patil"}</span> <span className="num">(9820199999)</span>
              </span>
            </div>
            <div className="text-right">
              <span className="num block">Verified: Dr. Demo, MBBS, DGO · Reg: MCI-41920</span>
              <span className="text-[12px] print:text-[9px]">{t("reports.dossier.footerStamp")}</span>
            </div>
          </div>
        </footer>
      </article>

      {selectedScan && (
        <div className="print:hidden">
          <OverlayShell
            title={selectedScan.title}
            subtitle={t("reports.dossier.dated", { date: d(selectedScan.date), lab: selectedScan.doctorOrLab })}
            closeLabel={t("common.close")}
            onClose={() => setSelectedScan(null)}
            size="lg"
            footer={
              <button type="button" onClick={() => setSelectedScan(null)} className={buttonSecondary}>
                {t("reports.dossier.closeViewer")}
              </button>
            }
          >
            <div className="space-y-4">
              <div className="h-64 w-full overflow-hidden rounded-[var(--radius-buttons)] bg-[var(--color-pc-ink)]">
                <div dangerouslySetInnerHTML={{ __html: selectedScan.svgImage }} className="h-full w-full" />
              </div>
              <dl className="flex flex-wrap gap-2">
                {selectedScan.keyMetrics.map((km, idx) => (
                  <div key={idx} className="rounded-[var(--radius-buttons)] bg-[var(--color-surface-1)] px-3 py-1.5">
                    <dt className="text-[12px] text-[var(--color-charcoal)]">{km.label}</dt>
                    <dd className="num text-[14px] font-semibold">
                      {km.value} {km.unit || ""}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-[var(--radius-buttons)] bg-[var(--color-surface-1)] p-3 text-[14px] leading-relaxed">
                <span className="mb-1 block font-semibold">{t("reports.dossier.radReport")}</span>
                <p>{selectedScan.findings}</p>
              </div>
            </div>
          </OverlayShell>
        </div>
      )}

      <ActionBar>
        <button type="button" onClick={handleShare} className={`${buttonSecondary} md:hidden`}>
          <ShareNetwork size={16} aria-hidden />
          <span>{copied ? t("reports.dossier.linkCopied") : t("reports.dossier.shareLink")}</span>
        </button>
        <button type="button" onClick={handlePrint} className={`${buttonPrimary} md:hidden`}>
          <Printer size={16} weight="bold" aria-hidden />
          <span>{t("reports.dossier.print")}</span>
        </button>
      </ActionBar>
    </div>
  );
}
