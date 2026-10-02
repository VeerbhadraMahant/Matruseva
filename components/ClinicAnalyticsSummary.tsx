"use client";

import { useId } from "react";
import { ChartPieSlice, CheckCircle, PhoneCall, Baby, Users, Info } from "@phosphor-icons/react";
import { Panel, Tag } from "@/components/ui";

/**
 * =========================================================================
 * ANC CLINICAL COMPLIANCE FORMULA (Clinical Audit Documentation):
 *
 * ANC Compliance Rate (%) =
 *   (Active Pregnancies with 100% Milestones Attended on Schedule / Total Active Pregnancies) * 100
 *
 * Clinical Definition for Doctors:
 * - A pregnant mother is considered "Compliant / On-Schedule" if she has ZERO
 *   overdue visits, laboratory investigations, ultrasound scans, or tetanus toxoid
 *   injections relative to her current gestational age.
 * - Delivered and closed pregnancies are excluded from this metric to avoid
 *   artificially depressing compliance scores.
 * - If Total Active Pregnancies = 0, rate is defined as 0% (no NaN or division by zero).
 * =========================================================================
 */

export interface TrimesterBreakdown {
  t1: number; // 1 to 12 weeks
  t2: number; // 13 to 27 weeks
  t3: number; // 28+ weeks
}

export interface ClinicAnalyticsProps {
  totalActive: number;
  compliantCount: number;
  complianceRate: number;
  trimester: TrimesterBreakdown;
  contactsAttempted: number;
  contactsReached: number;
  contactSuccessRate: number;
  overdueCount: number;
  deliveriesThisMonth: number;
}

export function ClinicAnalyticsSummary({
  totalActive,
  compliantCount,
  complianceRate,
  trimester,
  contactsAttempted,
  contactsReached,
  contactSuccessRate,
  overdueCount,
  deliveriesThisMonth,
}: ClinicAnalyticsProps) {
  const t1Pct = totalActive > 0 ? Math.round((trimester.t1 / totalActive) * 100) : 0;
  const t2Pct = totalActive > 0 ? Math.round((trimester.t2 / totalActive) * 100) : 0;
  const t3Pct = totalActive > 0 ? Math.max(0, 100 - t1Pct - t2Pct) : 0;

  const complianceId = useId();

  return (
    <Panel
      title="Clinic Compliance & Macro Analytics"
      action={
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-charcoal)]">
          <Info size={14} className="text-[var(--color-primary)]" />
          <span>Real-time ANC Performance</span>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        {/* Top Macro Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Overall ANC Compliance */}
          <div className="border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
                ANC Compliance
              </span>
              <CheckCircle size={16} weight="fill" className="text-[var(--color-on-track)]" />
            </div>
            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="num text-[28px] font-bold text-[var(--color-foreground)] leading-none">
                  {complianceRate}%
                </span>
                <span className="text-[12px] text-[var(--color-charcoal)]">on-schedule</span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-charcoal)]">
                {compliantCount} of {totalActive} active mothers up-to-date
              </p>
            </div>
            {/* Compliance mini progress bar */}
            <div className="w-full bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[var(--color-on-track)] h-full transition-all duration-500"
                style={{ width: `${complianceRate}%` }}
                role="progressbar"
                aria-valuenow={complianceRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-labelledby={complianceId}
              />
            </div>
          </div>

          {/* 2. Trimester Distribution Summary */}
          <div className="border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
                Active Cohort
              </span>
              <ChartPieSlice size={16} weight="fill" className="text-[var(--color-primary)]" />
            </div>
            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="num text-[28px] font-bold text-[var(--color-foreground)] leading-none">
                  {totalActive}
                </span>
                <span className="text-[12px] text-[var(--color-charcoal)]">mothers</span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-charcoal)] font-mono">
                T1: {trimester.t1} · T2: {trimester.t2} · T3: {trimester.t3}
              </p>
            </div>
            {/* Trimester composite bar */}
            <div className="w-full bg-[var(--color-border)] h-1.5 rounded-full flex overflow-hidden">
              <div style={{ width: `${t1Pct}%` }} className="bg-emerald-600 h-full" title={`T1: ${t1Pct}%`} />
              <div style={{ width: `${t2Pct}%` }} className="bg-teal-500 h-full" title={`T2: ${t2Pct}%`} />
              <div style={{ width: `${t3Pct}%` }} className="bg-amber-500 h-full" title={`T3: ${t3Pct}%`} />
            </div>
          </div>

          {/* 3. Follow-Up Outreach Success */}
          <div className="border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
                Contact Success
              </span>
              <PhoneCall size={16} weight="fill" className="text-[#25D366]" />
            </div>
            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="num text-[28px] font-bold text-[var(--color-foreground)] leading-none">
                  {contactSuccessRate}%
                </span>
                <span className="text-[12px] text-[var(--color-charcoal)]">reached</span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-charcoal)]">
                {contactsReached} of {contactsAttempted} calls/messages
              </p>
            </div>
            <div className="w-full bg-[var(--color-border)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#25D366] h-full transition-all duration-500"
                style={{ width: `${contactSuccessRate}%` }}
              />
            </div>
          </div>

          {/* 4. Deliveries This Month */}
          <div className="border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
                Deliveries (Month)
              </span>
              <Baby size={16} weight="bold" className="text-[var(--color-primary)]" />
            </div>
            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="num text-[28px] font-bold text-[var(--color-foreground)] leading-none">
                  {deliveriesThisMonth}
                </span>
                <span className="text-[12px] text-[var(--color-charcoal)]">delivered</span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-charcoal)]">
                {overdueCount > 0 ? `${overdueCount} active with overdue items` : "All active visits on track"}
              </p>
            </div>
            <div className="text-[11px] font-medium text-[var(--color-on-track)]">
              Closed from active queue
            </div>
          </div>
        </div>

        {/* Detailed Visual Panels */}
        {totalActive === 0 ? (
          <div className="border border-dashed border-[var(--color-border-strong)] p-6 text-center">
            <Users size={28} className="mx-auto text-[var(--color-charcoal)] mb-2" />
            <h4 className="text-[14px] font-bold text-[var(--color-foreground)]">No Active Pregnancies</h4>
            <p className="text-[12px] text-[var(--color-charcoal)] mt-1 max-w-sm mx-auto">
              Register new patients to view trimester breakdowns, visit compliance percentages, and outreach stats.
            </p>
          </div>
        ) : (
          <div className="border border-[var(--color-border)] p-4 bg-[var(--color-background)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-[13px] font-bold text-[var(--color-foreground)] uppercase tracking-wide">
                  Trimester Cohort Distribution
                </h4>
                <p className="text-[11px] text-[var(--color-charcoal)]">
                  Active pregnancies categorized by gestational age milestones
                </p>
              </div>
              <div className="flex items-center gap-3 text-[12px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  <span>Trimester 1 (1–12w)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                  <span>Trimester 2 (13–27w)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>Trimester 3 (28w+)</span>
                </span>
              </div>
            </div>

            {/* Trimester visual breakdown cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-l-4 border-l-emerald-600 border-[var(--color-border)] p-3 bg-[var(--color-surface-1)]">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-emerald-800">1st Trimester</span>
                  <Tag tone="ok">{t1Pct}%</Tag>
                </div>
                <div className="num mt-2 text-[22px] font-bold text-[var(--color-foreground)] leading-none">
                  {trimester.t1} <span className="text-[12px] font-normal text-[var(--color-charcoal)]">mothers</span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--color-charcoal)]">
                  Booking visits, dating scans & early lab panels
                </p>
              </div>

              <div className="border border-l-4 border-l-teal-500 border-[var(--color-border)] p-3 bg-[var(--color-surface-1)]">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-teal-800">2nd Trimester</span>
                  <Tag tone="info">{t2Pct}%</Tag>
                </div>
                <div className="num mt-2 text-[22px] font-bold text-[var(--color-foreground)] leading-none">
                  {trimester.t2} <span className="text-[12px] font-normal text-[var(--color-charcoal)]">mothers</span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--color-charcoal)]">
                  TIFFA anomaly scans, OGTT & Td injections
                </p>
              </div>

              <div className="border border-l-4 border-l-amber-500 border-[var(--color-border)] p-3 bg-[var(--color-surface-1)]">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-amber-800">3rd Trimester</span>
                  <Tag tone="warning">{t3Pct}%</Tag>
                </div>
                <div className="num mt-2 text-[22px] font-bold text-[var(--color-foreground)] leading-none">
                  {trimester.t3} <span className="text-[12px] font-normal text-[var(--color-charcoal)]">mothers</span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--color-charcoal)]">
                  Growth scans, NST monitoring & delivery planning
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
