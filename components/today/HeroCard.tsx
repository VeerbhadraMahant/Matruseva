import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { CountUp } from "./CountUp";

function SubStat({ href, value, label, dot }: { href: string; value: number; label: string; dot: string }) {
  return (
    <Link
      href={href}
      className="group flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-pc-card/70"
    >
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      <span>
        <CountUp value={value} className="block text-[22px] font-semibold leading-tight tabular-nums" />
        <span className="block text-[13px] text-pc-muted">{label}</span>
      </span>
      <ArrowRight
        size={14}
        aria-hidden
        className="ml-1 text-pc-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </Link>
  );
}

export function HeroCard({
  dueToday,
  overdue,
  atRisk,
  totalActive,
}: {
  dueToday: number;
  overdue: number;
  atRisk: number;
  totalActive: number;
}) {
  return (
    <section
      aria-labelledby="hero-title"
      className="pc-glass relative isolate overflow-hidden rounded-[28px] p-6 md:p-7"
    >
      {/* Decorative: soft wash + concentric rings. No imagery. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-pc-lilac)_85%,transparent)_0%,transparent_60%)]"
      />
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="absolute -right-14 -top-14 -z-10 h-64 w-64 text-pc-plum opacity-[0.07]"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="100" cy="100" r="96" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="72" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="48" strokeWidth="1.5" />
      </svg>

      <p id="hero-title" className="text-[12px] font-semibold uppercase tracking-[0.12em] text-pc-muted">
        Patients due today
      </p>
      <div className="mt-2 flex items-end gap-3">
        <CountUp value={dueToday} className="text-[76px] font-medium leading-[0.9] tracking-[-0.04em] tabular-nums" />
        <p className="pb-2 text-[13px] text-pc-muted">
          of <span className="font-semibold text-pc-ink tabular-nums">{totalActive}</span> active
          <br />
          pregnancies
        </p>
      </div>

      <div className="-mx-3 mt-5 flex flex-wrap gap-1 border-t border-pc-line/70 pt-3">
        <SubStat href="/calls?f=overdue" value={overdue} label="Overdue" dot="bg-pc-overdue" />
        <SubStat href="/calls?f=at_risk" value={atRisk} label="At risk" dot="bg-pc-risk" />
      </div>
    </section>
  );
}
