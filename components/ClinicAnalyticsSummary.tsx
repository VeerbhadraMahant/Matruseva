import { ChartPieSlice, CheckCircle, ClipboardText, PhoneCall, Users } from "@phosphor-icons/react/dist/ssr";
import { CountUp } from "@/components/today/CountUp";

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

function Ring({ pct, colorClass, label }: { pct: number; colorClass: string; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90" role="img" aria-label={label}>
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" className="stroke-pc-lilac" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped / 100)}
        className={`${colorClass} transition-[stroke-dashoffset] duration-700 ease-out`}
      />
    </svg>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="pc-glass flex min-h-[148px] flex-col justify-between gap-3 rounded-[22px] p-4 transition-[transform,box-shadow] duration-200 hover:shadow-[0_18px_40px_-20px_rgb(62_42_92/0.35)] motion-safe:hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-pc-muted">{title}</h3>
        <span aria-hidden className="text-pc-plum">
          {icon}
        </span>
      </div>
      {children}
    </div>
  );
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

  return (
    <section aria-labelledby="analytics-title" className="space-y-3">
      <h2 id="analytics-title" className="px-1 text-[17px] font-semibold">
        Clinic overview
      </h2>

      {totalActive === 0 ? (
        <div className="pc-glass rounded-[22px] p-6 text-center">
          <Users size={28} className="mx-auto mb-2 text-pc-muted" aria-hidden />
          <p className="text-[15px] font-medium">No active pregnancies</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-pc-muted">
            Register patients to see visit compliance, trimester mix and outreach results here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Card title="ANC compliance" icon={<CheckCircle size={18} />}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Ring pct={complianceRate} colorClass="stroke-pc-plum" label={`${complianceRate}% on schedule`} />
              <div>
                <p className="text-[28px] font-semibold leading-none tabular-nums">
                  <CountUp value={complianceRate} />%
                </p>
                <p className="mt-1 text-[12px] text-pc-muted">
                  {compliantCount} of {totalActive} up to date
                </p>
              </div>
            </div>
          </Card>

          <Card title="Contact success" icon={<PhoneCall size={18} />}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Ring pct={contactSuccessRate} colorClass="stroke-pc-active" label={`${contactSuccessRate}% reached`} />
              <div>
                <p className="text-[28px] font-semibold leading-none tabular-nums">
                  <CountUp value={contactSuccessRate} />%
                </p>
                <p className="mt-1 text-[12px] text-pc-muted">
                  {contactsReached} of {contactsAttempted} reached
                </p>
              </div>
            </div>
          </Card>

          <Card title="Active cohort" icon={<ChartPieSlice size={18} />}>
            <div>
              <p className="text-[28px] font-semibold leading-none tabular-nums">
                <CountUp value={totalActive} />
                <span className="ml-1.5 text-[13px] font-normal text-pc-muted">mothers</span>
              </p>
              <div
                className="mt-3 flex h-2 overflow-hidden rounded-full bg-pc-lilac"
                role="img"
                aria-label={`Trimester 1: ${trimester.t1}, trimester 2: ${trimester.t2}, trimester 3: ${trimester.t3}`}
              >
                <div style={{ width: `${t1Pct}%` }} className="bg-pc-lilac-strong" />
                <div style={{ width: `${t2Pct}%` }} className="bg-pc-plum-mid" />
                <div style={{ width: `${t3Pct}%` }} className="bg-pc-plum" />
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-pc-muted">
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-pc-lilac-strong" />
                  T1 <span className="font-semibold text-pc-ink tabular-nums">{trimester.t1}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-pc-plum-mid" />
                  T2 <span className="font-semibold text-pc-ink tabular-nums">{trimester.t2}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-pc-plum" />
                  T3 <span className="font-semibold text-pc-ink tabular-nums">{trimester.t3}</span>
                </li>
              </ul>
            </div>
          </Card>

          <Card title="Deliveries this month" icon={<ClipboardText size={18} />}>
            <div>
              <p className="text-[28px] font-semibold leading-none tabular-nums">
                <CountUp value={deliveriesThisMonth} />
                <span className="ml-1.5 text-[13px] font-normal text-pc-muted">delivered</span>
              </p>
              <p className="mt-2 text-[12px] text-pc-muted">
                {overdueCount > 0 ? `${overdueCount} active with overdue items` : "All active visits on track"}
              </p>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
