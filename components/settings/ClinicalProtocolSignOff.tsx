"use client";

import { useState, useTransition } from "react";
import {
  ShieldCheck,
  CheckCircle,
  FileText,
  ArrowsClockwise,
  CalendarCheck,
  Stethoscope,
} from "@phosphor-icons/react";
import { applyStandardFogsiSchedule } from "@/app/(app)/settings/actions";
import {
  FOGSI_MOHFW_SCHEDULE_ITEMS,
  CLINICAL_RISK_THRESHOLDS,
  CLINICAL_SIGN_OFF_METADATA,
} from "@/lib/clinicalProtocols";

export function ClinicalProtocolSignOff() {
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showRationales, setShowRationales] = useState(false);

  const handleApplyCertifiedSchedule = () => {
    startTransition(async () => {
      const res = await applyStandardFogsiSchedule();
      if (res.error) {
        setStatusMessage(`Error: ${res.error}`);
      } else {
        setStatusMessage("✅ Successfully aligned ANC schedule template & risk thresholds with FOGSI / MoHFW guidelines.");
        setTimeout(() => setStatusMessage(null), 5000);
      }
    });
  };

  return (
    <div className="space-y-3.5">
      {/* Accreditation Header Card */}
      <div className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary-surface)] p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--color-primary)] text-white">
              <ShieldCheck size={18} weight="fill" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-[13px] font-semibold text-[var(--color-foreground)]">
                  Clinical Lead Protocol Sign-Off
                </h4>
                <span className="rounded-xl flex items-center gap-1 bg-white px-2 py-0.5 text-[11px] font-bold text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                  <CheckCircle size={13} weight="fill" />
                  {CLINICAL_SIGN_OFF_METADATA.signOffStatus}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-foreground)]">
                Accredited in alignment with <strong>FOGSI</strong> (Federation of Obstetric and Gynaecological
                Societies of India) &amp; <strong>MoHFW</strong> Antenatal Guidelines.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--color-charcoal)]">
                <span>
                  <strong>Standard:</strong> {CLINICAL_SIGN_OFF_METADATA.version}
                </span>
                <span>
                  <strong>Last Audit:</strong> {CLINICAL_SIGN_OFF_METADATA.lastReviewed}
                </span>
                <span>
                  <strong>Signatory:</strong> {CLINICAL_SIGN_OFF_METADATA.certifiedBy}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={handleApplyCertifiedSchedule}
            className="rounded-xl flex items-center gap-1.5 border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1.5 text-[12px] font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <ArrowsClockwise size={14} className={isPending ? "animate-spin" : ""} />
            <span>Apply Certified FOGSI Windows</span>
          </button>
        </div>

        {statusMessage && (
          <div className="rounded-xl mt-3 border border-[#16a34a]/30 bg-[#F0FDF4] p-2 text-[12px] font-medium text-[#166534]">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Protocol Pillars Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--color-foreground)] mb-1">
            <CalendarCheck size={15} className="text-[var(--color-primary)]" />
            <span>ANC Schedule Governance</span>
          </div>
          <p className="text-[11px] text-[var(--color-charcoal)] leading-relaxed">
            12 certified milestones covering NT scan strictly at 11–13.85w, Anomaly TIFFA at 18–22w, and single-step DIPSI
            OGTT at 24–28w.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--color-foreground)] mb-1">
            <Stethoscope size={15} className="text-[var(--color-primary)]" />
            <span>Risk Threshold Justification</span>
          </div>
          <p className="text-[11px] text-[var(--color-charcoal)] leading-relaxed">
            {CLINICAL_RISK_THRESHOLDS.atRiskDays}d missed window flags overdue surveillance; {CLINICAL_RISK_THRESHOLDS.lostDays}d
            triggers lost-to-follow-up tracing to prevent undetected IUGR and pre-eclampsia.
          </p>
        </div>
      </div>

      {/* Accordion Toggle for Clinical Rationales */}
      <div className="border border-[var(--color-border)] bg-[var(--color-background)]">
        <button
          type="button"
          onClick={() => setShowRationales((v) => !v)}
          className="flex w-full items-center justify-between p-2.5 text-left text-[12px] font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-surface-1)]"
        >
          <span className="flex items-center gap-1.5">
            <FileText size={15} className="text-[var(--color-primary)]" />
            <span>View 12 Certified Milestones &amp; Evidence Rationales</span>
          </span>
          <span className="text-[11px] text-[var(--color-charcoal)]">
            {showRationales ? "Hide ▲" : "Show ▼"}
          </span>
        </button>

        {showRationales && (
          <div className="border-t border-[var(--color-border)] p-3 space-y-2.5 text-[12px] max-h-72 overflow-y-auto">
            {FOGSI_MOHFW_SCHEDULE_ITEMS.map((item) => (
              <div key={item.code} className="border-b border-[var(--color-border)] pb-2 last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {item.name}
                  </span>
                  <span className="num font-mono text-[11px] font-medium text-[var(--color-primary)]">
                    Weeks {item.windowStartWeek} – {item.windowEndWeek}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-charcoal)]">
                  {item.clinicalRationale}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
