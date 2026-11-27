"use client";

import { useState, useTransition } from "react";
import { ArrowsClockwise, CalendarCheck, CaretDown, FileText, Stethoscope } from "@phosphor-icons/react";
import { applyStandardFogsiSchedule } from "@/app/(app)/settings/actions";
import {
  FOGSI_MOHFW_SCHEDULE_ITEMS,
  CLINICAL_RISK_THRESHOLDS,
  CLINICAL_SIGN_OFF_METADATA,
} from "@/lib/clinicalProtocols";
import { useT, useLocale } from "@/lib/i18n/provider";
import { formatDate } from "@/lib/format";
import { careEventName } from "@/lib/clinicalLabels";
import { Tag, buttonPrimary } from "@/components/ui";

export function ClinicalProtocolSignOff() {
  const t = useT();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showRationales, setShowRationales] = useState(false);

  const handleApplyCertifiedSchedule = () => {
    startTransition(async () => {
      const res = await applyStandardFogsiSchedule();
      if (res.error) {
        setStatusMessage(t("settings.signoff.error", { error: res.error }));
      } else {
        setStatusMessage(t("settings.signoff.applied"));
        setTimeout(() => setStatusMessage(null), 5000);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tag tone="warning">{t("settings.signoff.statusPending")}</Tag>
          <button type="button" disabled={isPending} onClick={handleApplyCertifiedSchedule} className={`${buttonPrimary} min-h-11 w-full sm:w-auto`}>
            <ArrowsClockwise size={16} aria-hidden className={isPending ? "animate-spin" : ""} />
            {t("settings.signoff.apply")}
          </button>
        </div>
        <p className="text-[14px] leading-relaxed text-[var(--color-foreground)]">{t("settings.signoff.accredited")}</p>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[var(--color-charcoal)]">
          <div className="flex gap-1.5">
            <dt className="font-medium">{t("settings.signoff.standard")}</dt>
            <dd>{CLINICAL_SIGN_OFF_METADATA.version}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium">{t("settings.signoff.lastAudit")}</dt>
            <dd>{formatDate(CLINICAL_SIGN_OFF_METADATA.lastReviewed, locale)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium">{t("settings.signoff.signatory")}</dt>
            <dd>{CLINICAL_SIGN_OFF_METADATA.certifiedBy ?? t("settings.signoff.signatoryName")}</dd>
          </div>
        </dl>
        <div aria-live="polite">
          {statusMessage && (
            <p className="rounded-[var(--radius-buttons)] bg-[var(--color-on-track-surface)] px-3 py-2.5 text-[13px] font-medium text-[var(--color-on-track)]">
              {statusMessage}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3.5">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-foreground)]">
            <CalendarCheck size={16} aria-hidden className="text-[var(--color-primary)]" />
            {t("settings.signoff.governanceTitle")}
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--color-charcoal)]">{t("settings.signoff.governanceBody")}</p>
        </div>
        <div className="rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3.5">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-foreground)]">
            <Stethoscope size={16} aria-hidden className="text-[var(--color-primary)]" />
            {t("settings.signoff.riskTitle")}
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--color-charcoal)]">
            {t("settings.signoff.riskBody", {
              atRisk: CLINICAL_RISK_THRESHOLDS.atRiskDays,
              lost: CLINICAL_RISK_THRESHOLDS.lostDays,
            })}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-buttons)] border border-[var(--color-border)]">
        <button
          type="button"
          aria-expanded={showRationales}
          onClick={() => setShowRationales((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 text-left text-[13px] font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-1)]"
        >
          <span className="flex items-center gap-2">
            <FileText size={16} aria-hidden className="text-[var(--color-primary)]" />
            {t("settings.signoff.rationales")}
          </span>
          <CaretDown
            size={16}
            aria-hidden
            className={`shrink-0 text-[var(--color-charcoal)] transition-transform ${showRationales ? "rotate-180" : ""}`}
          />
        </button>

        {showRationales && (
          <ul className="max-h-80 divide-y divide-[var(--color-border)] overflow-y-auto border-t border-[var(--color-border)]">
            {FOGSI_MOHFW_SCHEDULE_ITEMS.map((item) => (
              <li key={item.code} className="px-3.5 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-[13px] font-semibold text-[var(--color-foreground)]">{careEventName(item.name, t)}</span>
                  <span className="num text-[12px] font-medium text-[var(--color-primary)]">
                    {t("settings.signoff.weeks", { start: item.windowStartWeek, end: item.windowEndWeek })}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-charcoal)]">{item.clinicalRationale}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
