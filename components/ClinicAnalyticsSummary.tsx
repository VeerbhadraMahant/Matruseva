import { getT } from "@/lib/i18n/server";
import { Empty, Panel } from "@/components/ui";

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

function Row({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3">
      <dt className="text-[13px] text-[var(--color-charcoal)]">{label}</dt>
      <dd className="num text-right text-[15px] font-semibold">
        {value}
        {detail && <span className="block text-[12px] font-normal text-[var(--color-charcoal)]">{detail}</span>}
      </dd>
    </div>
  );
}

export async function ClinicAnalyticsSummary({
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
  const { t } = await getT();
  const t1Pct = totalActive > 0 ? Math.round((trimester.t1 / totalActive) * 100) : 0;
  const t2Pct = totalActive > 0 ? Math.round((trimester.t2 / totalActive) * 100) : 0;
  const t3Pct = totalActive > 0 ? Math.max(0, 100 - t1Pct - t2Pct) : 0;

  return (
    <Panel title={t("today.overview.title")}>
      {totalActive === 0 ? (
        <Empty>
          <span className="block text-[15px] font-medium text-[var(--color-foreground)]">{t("today.overview.emptyTitle")}</span>
          {t("today.overview.emptyBody")}
        </Empty>
      ) : (
        <dl className="divide-y divide-[var(--color-border)]/70">
          <Row
            label={t("today.overview.compliance")}
            value={<span aria-label={t("today.overview.complianceRing", { pct: complianceRate })}>{complianceRate}%</span>}
            detail={t("today.overview.complianceCount", { done: compliantCount, total: totalActive })}
          />
          <Row
            label={t("today.overview.contact")}
            value={<span aria-label={t("today.overview.contactRing", { pct: contactSuccessRate })}>{contactSuccessRate}%</span>}
            detail={t("today.overview.contactCount", { reached: contactsReached, attempted: contactsAttempted })}
          />
          <div className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] text-[var(--color-charcoal)]">{t("today.overview.cohort")}</dt>
              <dd className="num text-[15px] font-semibold">
                {totalActive}
                <span className="ml-1.5 text-[12px] font-normal text-[var(--color-charcoal)]">
                  {t("today.overview.mothers", { count: totalActive })}
                </span>
              </dd>
            </div>
            <div
              className="mt-2 flex h-2 overflow-hidden rounded-full bg-[var(--color-pc-lilac)]"
              role="img"
              aria-label={t("today.overview.trimesterAria", { t1: trimester.t1, t2: trimester.t2, t3: trimester.t3 })}
            >
              <div style={{ width: `${t1Pct}%` }} className="bg-[var(--color-pc-lilac-strong)]" />
              <div style={{ width: `${t2Pct}%` }} className="bg-[var(--color-pc-plum-mid)]" />
              <div style={{ width: `${t3Pct}%` }} className="bg-[var(--color-pc-plum)]" />
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--color-charcoal)]">
              {(
                [
                  ["today.overview.t1", trimester.t1, "bg-[var(--color-pc-lilac-strong)]"],
                  ["today.overview.t2", trimester.t2, "bg-[var(--color-pc-plum-mid)]"],
                  ["today.overview.t3", trimester.t3, "bg-[var(--color-pc-plum)]"],
                ] as const
              ).map(([key, n, dot]) => (
                <li key={key} className="flex items-center gap-1.5">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
                  {t(key)} <span className="num font-semibold text-[var(--color-foreground)]">{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <Row
            label={t("today.overview.deliveries")}
            value={
              <>
                {deliveriesThisMonth}
                <span className="ml-1.5 text-[12px] font-normal text-[var(--color-charcoal)]">{t("today.overview.delivered")}</span>
              </>
            }
            detail={overdueCount > 0 ? t("today.overview.withOverdue", { count: overdueCount }) : t("today.overview.allOnTrack")}
          />
        </dl>
      )}
    </Panel>
  );
}
