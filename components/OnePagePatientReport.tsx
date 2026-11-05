"use client";

import { useState, useRef } from "react";
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
  X,
  PhoneCall,
  Calendar,
  Baby,
  UsersThree,
  FirstAid,
} from "@phosphor-icons/react";
import type { PastObstetricHistory, FamilyPregnancyHistory, DiagnosticScanReport } from "@/lib/obstetricReportData";
import { VoiceCounselorButton } from "@/components/VoiceCounselorModal";
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
  const printAreaRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="min-h-screen bg-[var(--color-surface-1)]/60 text-[var(--color-foreground)] py-6 px-3 sm:px-6 print:p-0 print:bg-white">
      {/* Top Floating Control Bar (Screen Only) */}
      <div className="max-w-5xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/patients/${patient.id}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-charcoal)] hover:text-[var(--color-primary)] transition-colors"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>{t("reports.dossier.back")}</span>
          </Link>
          <span className="text-[var(--color-border-strong)]">|</span>
          <span className="text-[12px] font-semibold tracking-wide uppercase text-[var(--color-primary)]">
            {t("reports.dossier.label")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <VoiceCounselorButton
            variant="subtle"
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

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-charcoal)] hover:border-[var(--color-foreground)] transition-colors cursor-pointer"
          >
            <ShareNetwork size={15} />
            <span>{copied ? t("reports.dossier.linkCopied") : t("reports.dossier.shareLink")}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] text-white px-3.5 py-1.5 text-[12px] font-semibold hover:bg-[var(--color-primary-hover)] transition-colors shadow-xs cursor-pointer"
          >
            <Printer size={15} weight="bold" />
            <span>{t("reports.dossier.print")}</span>
          </button>
        </div>
      </div>

      {/* Main Single-Sheet Obstetric Dossier Document */}
      <div
        ref={printAreaRef}
        className="max-w-5xl mx-auto bg-white border border-[var(--color-border)] shadow-md rounded-2xl p-6 sm:p-8 print:border-none print:shadow-none print:p-0 print:rounded-none"
      >
        {/* Document Header: Clinical Authority Banner */}
        <header className="border-b-2 border-[var(--color-primary)] pb-4 mb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-[18px] sm:text-[22px] font-bold tracking-tight text-[var(--color-primary)]">
                  MATRUSETU
                </span>
                <span className="text-[10px] tracking-widest uppercase font-semibold text-[var(--color-charcoal)] border border-[var(--color-border)] px-1.5 py-0.5 rounded">
                  PMSMA / FRU
                </span>
              </div>
              <h1 className="text-[15px] sm:text-[17px] font-semibold text-slate-800 tracking-[-0.01em] mt-0.5">
                {t("reports.dossier.heading")}
              </h1>
              <p className="text-[11px] text-[var(--color-charcoal)] mt-0.5">
                {t("reports.dossier.subtitle", { clinic: patient.clinicName || t("reports.dossier.defaultClinic") })}
              </p>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold tracking-wide uppercase border mb-1">
                {isHighRisk ? (
                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border-red-200 px-2.5 py-0.5 rounded-full">
                    <ShieldWarning size={14} weight="fill" />
                    <span>{t("reports.dossier.hrp")}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <CheckCircle size={14} weight="fill" />
                    <span>{t("reports.dossier.routine")}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--color-charcoal)] font-mono">
                RCH/OPD: <span className="font-semibold text-slate-900">{patient.clinicPatientNo || "ANC-REG"}</span>
              </p>
            </div>
          </div>

          {/* Primary Patient Identification Strip */}
          <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-xl p-3 text-[12px]">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-charcoal)] block">{t("reports.dossier.mothersName")}</span>
              <span className="font-semibold text-slate-900 text-[13px]">{patient.name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-charcoal)] block">{t("reports.dossier.ageGpla")}</span>
              <span className="font-semibold text-slate-900">
                {patient.age ? t("patientDetail.header.ageYears", { age: patient.age }) : "—"} · G{patient.gravida ?? 1}P{patient.para ?? 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-charcoal)] block">{t("reports.dossier.bloodGroup")}</span>
              <span className={`font-semibold ${patient.rhNegative ? "text-red-700 font-bold" : "text-slate-900"}`}>
                {patient.bloodGroup || t("common.unknown")}
                {patient.rhNegative && ` ${t("reports.dossier.rhNeg")}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-charcoal)] block">{t("reports.dossier.ga")}</span>
              <span className="font-semibold text-[var(--color-primary)] font-mono">
                {patient.gaWeeks !== null ? t("clinical.ga.full", { weeks: patient.gaWeeks, days: patient.gaDaysRemainder ?? 0 }) : "—"}
                {patient.trimester && ` (${t("clinical.trimester.short", { n: patient.trimester })})`}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-charcoal)] block">{t("reports.dossier.edd")}</span>
              <span className="font-semibold text-slate-900 font-mono">{d(patient.edd)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-charcoal)] block">{t("reports.dossier.lmp")}</span>
              <span className="font-semibold text-slate-900 font-mono">{d(patient.lmp)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-charcoal)] block">{t("reports.dossier.phone")}</span>
              <span className="font-semibold text-slate-900">{patient.phone || "—"}</span>
            </div>
          </div>
        </header>

        {/* Two-Column Grid: Section 1 & Section 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Section 1: Past Obstetric History */}
          <div className="border border-[var(--color-border)] rounded-xl p-3.5 bg-white">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)]/70 pb-2 mb-2.5">
              <Baby size={16} className="text-[var(--color-primary)] shrink-0" />
              <h2 className="text-[13px] font-bold tracking-tight text-[var(--color-foreground)] uppercase">
                {t("reports.dossier.s1")}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] mb-2.5">
              <div className="bg-[var(--color-surface-1)] p-2 rounded-lg">
                <span className="text-[10px] text-[var(--color-charcoal)] block">{t("reports.dossier.prevMode")}</span>
                <span className="font-bold text-slate-900 text-[12px]">
                  {pastHistory.previousDeliveryMode === "LSCS" ? (
                    <span className="text-amber-800">{t("reports.dossier.prevLscs")}</span>
                  ) : pastHistory.previousDeliveryMode === "NVD" ? (
                    t("clinical.delivery.NVD")
                  ) : pastHistory.previousDeliveryMode === "None (Primi)" ? (
                    t("reports.dossier.primi")
                  ) : pastHistory.previousDeliveryMode.startsWith("Assisted") ? (
                    t("reports.dossier.assisted")
                  ) : (
                    pastHistory.previousDeliveryMode
                  )}
                </span>
              </div>

              <div className="bg-[var(--color-surface-1)] p-2 rounded-lg">
                <span className="text-[10px] text-[var(--color-charcoal)] block">{t("reports.dossier.pastComplications")}</span>
                <span className="font-semibold text-slate-900">
                  {pastHistory.pastPreEclampsia || pastHistory.pastGDM || pastHistory.pastPPH ? (
                    <span className="text-red-700 font-bold">
                      {[
                        pastHistory.pastPreEclampsia && "Pre-eclampsia",
                        pastHistory.pastGDM && t("reports.dossier.gdm"),
                        pastHistory.pastPPH && "PPH",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  ) : (
                    <span className="text-emerald-800">{t("reports.dossier.noneReported")}</span>
                  )}
                </span>
              </div>

              <div className="bg-[var(--color-surface-1)] p-2 rounded-lg">
                <span className="text-[10px] text-[var(--color-charcoal)] block">{t("reports.dossier.pastMiscarriages")}</span>
                <span className={`font-semibold ${pastHistory.pastMiscarriages > 0 ? "text-amber-700 font-bold" : "text-slate-900"}`}>
                  {pastHistory.pastMiscarriages > 0 ? t("reports.dossier.abortions", { count: pastHistory.pastMiscarriages }) : t("reports.dossier.nilZero")}
                  {pastHistory.pastStillbirths > 0 && ` · ${t("reports.dossier.stillbirths", { count: pastHistory.pastStillbirths })}`}
                </span>
              </div>

              <div className="bg-[var(--color-surface-1)] p-2 rounded-lg">
                <span className="text-[10px] text-[var(--color-charcoal)] block">{t("reports.dossier.interval")}</span>
                <span className="font-semibold text-slate-900">
                  {pastHistory.interPregnancyMonths ? t("common.unit.month", { count: pastHistory.interPregnancyMonths }) : t("reports.dossier.firstPreg")}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-700 bg-amber-50/50 border border-amber-200/50 rounded-lg p-2 leading-relaxed">
              <span className="font-semibold text-amber-900">{t("reports.dossier.clinicalNote")}</span>
              {pastHistory.notes}
            </p>
          </div>

          {/* Section 2: Family Pregnancy & Genetic History */}
          <div className="border border-[var(--color-border)] rounded-xl p-3.5 bg-white">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)]/70 pb-2 mb-2.5">
              <UsersThree size={16} className="text-[var(--color-primary)] shrink-0" />
              <h2 className="text-[13px] font-bold tracking-tight text-[var(--color-foreground)] uppercase">
                {t("reports.dossier.s2")}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] mb-2.5">
              <div className="bg-[var(--color-surface-1)] p-2 rounded-lg">
                <span className="text-[10px] text-[var(--color-charcoal)] block">{t("reports.dossier.famPih")}</span>
                <span className="font-semibold">
                  {familyHistory.familyPreEclampsia ? (
                    <span className="text-red-700 font-bold">{t("reports.dossier.famPihYes")}</span>
                  ) : (
                    <span className="text-slate-800">{t("reports.dossier.famPihNo")}</span>
                  )}
                </span>
              </div>

              <div className="bg-[var(--color-surface-1)] p-2 rounded-lg">
                <span className="text-[10px] text-[var(--color-charcoal)] block">{t("reports.dossier.famDiabetes")}</span>
                <span className="font-semibold">
                  {familyHistory.familyDiabetes ? (
                    <span className="text-amber-800 font-bold">{t("reports.dossier.famDiabetesYes")}</span>
                  ) : (
                    <span className="text-slate-800">{t("reports.dossier.negative")}</span>
                  )}
                </span>
              </div>

              <div className="bg-[var(--color-surface-1)] p-2 rounded-lg">
                <span className="text-[10px] text-[var(--color-charcoal)] block">{t("reports.dossier.twins")}</span>
                <span className="font-semibold">
                  {familyHistory.familyTwins ? (
                    <span className="text-indigo-800 font-bold">{t("reports.dossier.twinsYes")}</span>
                  ) : (
                    <span className="text-slate-800">{t("reports.dossier.no")}</span>
                  )}
                </span>
              </div>

              <div className="bg-[var(--color-surface-1)] p-2 rounded-lg">
                <span className="text-[10px] text-[var(--color-charcoal)] block">{t("reports.dossier.genetic")}</span>
                <span className="font-semibold text-slate-800">
                  {familyHistory.familyGeneticAnomalies ? (
                    <span className="text-red-700 font-bold">{t("reports.dossier.geneticFlag")}</span>
                  ) : (
                    t("reports.dossier.nilReported")
                  )}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-700 bg-indigo-50/40 border border-indigo-200/50 rounded-lg p-2 leading-relaxed">
              <span className="font-semibold text-indigo-950">{t("reports.dossier.familialRisk")}</span>
              {familyHistory.notes}
            </p>
          </div>
        </div>

        {/* Section 3: Longitudinal Vitals Track (Current Pregnancy) */}
        <div className="border border-[var(--color-border)] rounded-xl p-3.5 bg-white mb-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/70 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Heartbeat size={16} className="text-[var(--color-primary)] shrink-0" />
              <h2 className="text-[13px] font-bold tracking-tight text-[var(--color-foreground)] uppercase">
                {t("reports.dossier.s3")}
              </h2>
            </div>
            {latestVisit && (
              <span className="text-[11px] text-[var(--color-charcoal)]">
                {t("reports.dossier.latestVisit")} <span className="font-mono font-semibold text-slate-800">{d(latestVisit.visitDate)}</span>
              </span>
            )}
          </div>

          {/* Latest Key Vitals Gauge Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-3 text-center">
            <div className="bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border)]/50">
              <span className="text-[10px] text-[var(--color-charcoal)] block uppercase">{t("reports.dossier.bp")}</span>
              <span
                className={`text-[15px] font-bold font-mono ${
                  latestVisit?.bpSys && (latestVisit.bpSys >= 140 || (latestVisit.bpDia && latestVisit.bpDia >= 90))
                    ? "text-red-700"
                    : latestVisit?.bpSys && latestVisit.bpSys >= 130
                    ? "text-amber-700"
                    : "text-slate-900"
                }`}
              >
                {latestVisit?.bpSys && latestVisit?.bpDia ? `${latestVisit.bpSys}/${latestVisit.bpDia}` : "—"}
              </span>
              <span className="text-[9px] text-[var(--color-charcoal)] block">mmHg</span>
            </div>

            <div className="bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border)]/50">
              <span className="text-[10px] text-[var(--color-charcoal)] block uppercase">{t("reports.dossier.hb")}</span>
              <span
                className={`text-[15px] font-bold font-mono ${
                  latestVisit?.hb && latestVisit.hb < 7.0
                    ? "text-red-700"
                    : latestVisit?.hb && latestVisit.hb < 11.0
                    ? "text-amber-700"
                    : "text-emerald-800"
                }`}
              >
                {latestVisit?.hb ? `${latestVisit.hb}` : "—"}
              </span>
              <span className="text-[9px] text-[var(--color-charcoal)] block">g/dL</span>
            </div>

            <div className="bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border)]/50">
              <span className="text-[10px] text-[var(--color-charcoal)] block uppercase">{t("reports.dossier.weight")}</span>
              <span className="text-[15px] font-bold font-mono text-slate-900">
                {latestVisit?.weight ? `${latestVisit.weight}` : "—"}
              </span>
              <span className="text-[9px] text-[var(--color-charcoal)] block">kg</span>
            </div>

            <div className="bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border)]/50">
              <span className="text-[10px] text-[var(--color-charcoal)] block uppercase">{t("reports.dossier.fhr")}</span>
              <span
                className={`text-[15px] font-bold font-mono ${
                  latestVisit?.fhr && (latestVisit.fhr < 110 || latestVisit.fhr > 160)
                    ? "text-red-700"
                    : "text-slate-900"
                }`}
              >
                {latestVisit?.fhr ? `${latestVisit.fhr}` : "—"}
              </span>
              <span className="text-[9px] text-[var(--color-charcoal)] block">bpm</span>
            </div>

            <div className="bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border)]/50">
              <span className="text-[10px] text-[var(--color-charcoal)] block uppercase">{t("reports.dossier.fundal")}</span>
              <span className="text-[15px] font-bold font-mono text-slate-900">
                {latestVisit?.fundalHeight ? `${latestVisit.fundalHeight}` : "—"}
              </span>
              <span className="text-[9px] text-[var(--color-charcoal)] block">cm</span>
            </div>

            <div className="bg-[var(--color-surface-1)] p-2 rounded-lg border border-[var(--color-border)]/50">
              <span className="text-[10px] text-[var(--color-charcoal)] block uppercase">{t("reports.dossier.urine")}</span>
              <span className="text-[13px] font-bold font-mono text-slate-800 mt-0.5 block">{t("reports.dossier.nilNil")}</span>
              <span className="text-[9px] text-[var(--color-charcoal)] block">{t("reports.dossier.dipstick")}</span>
            </div>
          </div>

          {/* Vitals History Progression Table */}
          {visits.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]/70">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-[var(--color-surface-1)] text-[10px] uppercase tracking-wider text-[var(--color-charcoal)]">
                  <tr>
                    <th className="py-1.5 px-3">{t("common.date")}</th>
                    <th className="py-1.5 px-2">GA</th>
                    <th className="py-1.5 px-2">{t("reports.dossier.thBp")}</th>
                    <th className="py-1.5 px-2">{t("reports.dossier.thWeight")}</th>
                    <th className="py-1.5 px-2">{t("reports.dossier.thHb")}</th>
                    <th className="py-1.5 px-2">{t("reports.dossier.thFhr")}</th>
                    <th className="py-1.5 px-2">{t("reports.dossier.thFh")}</th>
                    <th className="py-1.5 px-3">{t("reports.dossier.thRemarks")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/40 font-mono">
                  {visits.slice(0, 4).map((v, idx) => (
                    <tr key={idx} className="hover:bg-[var(--color-surface-1)]/40">
                      <td className="py-1.5 px-3 font-semibold text-slate-900 whitespace-nowrap">{d(v.visitDate)}</td>
                      <td className="py-1.5 px-2 text-slate-700">{v.gaWeeks || "—"}</td>
                      <td className="py-1.5 px-2">
                        {v.bpSys && v.bpDia ? (
                          <span
                            className={
                              v.bpSys >= 140 || v.bpDia >= 90
                                ? "text-red-700 font-bold"
                                : v.bpSys >= 130
                                ? "text-amber-700 font-semibold"
                                : "text-slate-800"
                            }
                          >
                            {v.bpSys}/{v.bpDia}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-slate-800">{v.weight ?? "—"}</td>
                      <td className="py-1.5 px-2">
                        {v.hb ? (
                          <span className={v.hb < 11.0 ? "text-amber-700 font-bold" : "text-slate-800"}>
                            {v.hb}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-slate-800">{v.fhr ?? "—"}</td>
                      <td className="py-1.5 px-2 text-slate-800">{v.fundalHeight ?? "—"}</td>
                      <td className="py-1.5 px-3 font-sans text-slate-700 text-[10px] max-w-44 break-words">
                        {v.notes || t("reports.dossier.routineFollowup")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 4: Sonography (USG) & Diagnostic Lab Test Reports */}
        <div className="border border-[var(--color-border)] rounded-xl p-3.5 bg-white mb-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/70 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[var(--color-primary)] shrink-0" />
              <h2 className="text-[13px] font-bold tracking-tight text-[var(--color-foreground)] uppercase">
                {t("reports.dossier.s4")}
              </h2>
            </div>
            <span className="text-[10px] text-[var(--color-charcoal)]">
              {t("reports.dossier.scanHint")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {scans.map((scan) => (
              <div
                key={scan.id}
                onClick={() => setSelectedScan(scan)}
                className="group border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface-1)]/30 hover:border-[var(--color-primary)] transition-all cursor-pointer shadow-2xs hover:shadow-sm"
              >
                {/* Visual Sonogram / Lab Preview Thumbnail */}
                <div className="relative h-28 w-full bg-[#0a0d14] overflow-hidden border-b border-[var(--color-border)]/50">
                  <div
                    dangerouslySetInnerHTML={{ __html: scan.svgImage }}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                    <span className="text-[10px] font-medium text-white flex items-center gap-1">
                      <MagnifyingGlassPlus size={13} /> {t("reports.dossier.inspect")}
                    </span>
                    <span className="text-[9px] font-mono text-cyan-300">{t("reports.dossier.hiRes")}</span>
                  </div>
                </div>

                {/* Scan Summary Details */}
                <div className="p-2.5">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h3 className="text-[11px] font-bold text-slate-900 group-hover:text-[var(--color-primary)] line-clamp-1">
                      {scan.title}
                    </h3>
                    <span className="text-[9px] font-mono text-[var(--color-charcoal)] shrink-0">
                      {d(scan.date)}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed mb-2">
                    {scan.findings}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)]/40 pt-1.5">
                    {scan.keyMetrics.slice(0, 3).map((metric, mIdx) => (
                      <span
                        key={mIdx}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                          metric.alert
                            ? "bg-red-50 text-red-700 font-bold border border-red-200"
                            : "bg-white text-slate-800 border border-slate-200"
                        }`}
                      >
                        <span className="text-slate-500">{metric.label}: </span>
                        {metric.value}
                        {metric.unit && ` ${metric.unit}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5 & Section 6: ANC Milestones & PMSMA Clinical Risk Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Section 5: ANC Care Milestones */}
          <div className="border border-[var(--color-border)] rounded-xl p-3.5 bg-white">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)]/70 pb-2 mb-2.5">
              <Calendar size={16} className="text-[var(--color-primary)] shrink-0" />
              <h2 className="text-[13px] font-bold tracking-tight text-[var(--color-foreground)] uppercase">
                {t("reports.dossier.s5")}
              </h2>
            </div>

            <div className="space-y-1.5 text-[11px]">
              {careEvents.slice(0, 5).map((ce, cIdx) => (
                <div
                  key={cIdx}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[var(--color-surface-1)]/60"
                >
                  <span className="font-medium text-slate-800">{careEventName(ce.name, t)}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      ce.status === "done"
                        ? "bg-emerald-100 text-emerald-800"
                        : ce.status === "overdue"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {ce.status === "done"
                      ? t("clinical.status.completed")
                      : ce.status === "overdue"
                      ? careStatusLabel("overdue", t)
                      : t("clinical.status.dueSoon")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Clinical Decision Protocol & Risk Flags */}
          <div className="border border-[var(--color-border)] rounded-xl p-3.5 bg-white">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)]/70 pb-2 mb-2.5">
              <FirstAid size={16} className="text-[var(--color-primary)] shrink-0" />
              <h2 className="text-[13px] font-bold tracking-tight text-[var(--color-foreground)] uppercase">
                {t("reports.dossier.s6")}
              </h2>
            </div>

            {riskFlags.length > 0 || isHighRisk ? (
              <div className="space-y-2">
                <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-[11px]">
                  <p className="font-bold text-red-900 mb-1 flex items-center gap-1.5">
                    <ShieldWarning size={14} weight="fill" className="text-red-700" />
                    <span>{t("reports.dossier.activeFlags")}</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-red-800">
                    {riskFlags.map((flag, fIdx) => (
                      <li key={fIdx}>{flag}</li>
                    ))}
                    {pastHistory.previousDeliveryMode === "LSCS" && (
                      <li>{t("reports.dossier.prevCs")}</li>
                    )}
                    {patient.rhNegative && (
                      <li>{t("reports.dossier.rhNegAdvice")}</li>
                    )}
                  </ul>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-[10px] text-emerald-900">
                  <span className="font-bold">{t("reports.dossier.pmsma")}</span>
                  {t("reports.dossier.pmsmaBody")}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                <CheckCircle size={24} weight="fill" className="text-emerald-700 mx-auto mb-1.5" />
                <p className="text-[12px] font-bold text-emerald-900">{t("reports.dossier.lowRisk")}</p>
                <p className="text-[10px] text-emerald-700 mt-0.5">
                  {t("reports.dossier.lowRiskBody")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Document Footer: Emergency 108 Dispatch & Medical Verification Stamp */}
        <footer className="border-t border-[var(--color-border)] pt-3.5 text-[11px] text-[var(--color-charcoal)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg text-red-800 font-bold">
                <PhoneCall size={14} weight="bold" />
                <span>{t("reports.dossier.hotline")}</span>
              </div>
              <span className="text-[10px]">
                {t("reports.dossier.asha")} <span className="font-semibold text-slate-800">{patient.ashaName || "Rekha Patil"}</span> (9820199999)
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] block font-mono">
                Verified: Dr. Demo, MBBS, DGO · Reg: MCI-41920
              </span>
              <span className="text-[9px] text-slate-400">
                {t("reports.dossier.footerStamp")}
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* High-Resolution Sonography & Lab Report Lightbox Modal */}
      {selectedScan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedScan.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs print:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedScan(null);
          }}
        >
          <div className="relative w-full max-w-2xl bg-[var(--color-background)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--color-border)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-[var(--color-surface-1)] border-b border-[var(--color-border)] px-5 py-3">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900">{selectedScan.title}</h3>
                <p className="text-[11px] text-[var(--color-charcoal)]">
                  {t("reports.dossier.dated", { date: d(selectedScan.date), lab: selectedScan.doctorOrLab })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScan(null)}
                aria-label={t("common.close")}
                className="p-1 rounded-lg hover:bg-black/5 text-slate-600 cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Modal Image Display */}
            <div className="p-5">
              <div className="w-full h-64 bg-[#0a0d14] rounded-xl overflow-hidden shadow-inner mb-4 flex items-center justify-center">
                <div dangerouslySetInnerHTML={{ __html: selectedScan.svgImage }} className="w-full h-full" />
              </div>

              {/* Clinical Metrics & Findings */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selectedScan.keyMetrics.map((km, idx) => (
                    <div
                      key={idx}
                      className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[11px]"
                    >
                      <span className="text-[10px] text-[var(--color-charcoal)] block">{km.label}</span>
                      <span className="font-mono font-bold text-slate-900">
                        {km.value} {km.unit || ""}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-[var(--color-surface-1)]/70 p-3 rounded-xl border border-[var(--color-border)]/60 text-[12px] leading-relaxed">
                  <span className="font-semibold text-slate-900 block mb-1">{t("reports.dossier.radReport")}</span>
                  <p className="text-slate-700">{selectedScan.findings}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 bg-[var(--color-surface-1)] border-t border-[var(--color-border)] px-5 py-2.5">
              <button
                type="button"
                onClick={() => setSelectedScan(null)}
                className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] bg-white text-[12px] font-semibold hover:border-slate-400 cursor-pointer"
              >
                {t("reports.dossier.closeViewer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
