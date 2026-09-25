import Link from "next/link";
import type { FlagSeverity } from "@/lib/clinical";

export type Tone = "critical" | "warning" | "ok" | "info" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  critical: "border-[var(--color-overdue)] bg-[var(--color-overdue-surface)] text-[var(--color-overdue)]",
  warning: "border-[var(--color-due)] bg-[var(--color-due-surface)] text-[var(--color-due)]",
  ok: "border-[var(--color-on-track)] bg-[var(--color-on-track-surface)] text-[var(--color-on-track)]",
  info: "border-[var(--color-info)] bg-[var(--color-info-surface)] text-[var(--color-info)]",
  neutral: "border-[var(--color-border-strong)] bg-[var(--color-surface-1)] text-[var(--color-charcoal)]",
};

export const SEVERITY_TONE: Record<FlagSeverity, Tone> = { critical: "critical", warning: "warning", info: "info" };

export function Tag({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border-l-[3px] px-1.5 py-px text-[12px] font-medium leading-5 ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)] px-6 py-4">
      <div>
        <h1 className="text-[22px] leading-7">{title}</h1>
        {meta && <div className="mt-0.5 text-[13px] text-[var(--color-charcoal)]">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  count,
  action,
  children,
  className = "",
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-[var(--color-border)] bg-[var(--color-background)] ${className}`}>
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-[var(--color-border)] px-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
          {title}
          {count !== undefined && <span className="num ml-2 text-[var(--color-foreground)]">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-6 text-[13px] text-[var(--color-charcoal)]">{children}</p>;
}

export const buttonPrimary =
  "inline-flex min-h-9 items-center justify-center gap-1.5 bg-[var(--color-primary)] px-3 text-[13px] font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50";
export const buttonSecondary =
  "inline-flex min-h-9 items-center justify-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[13px] font-medium text-[var(--color-foreground)] hover:border-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50";

export const th =
  "sticky top-0 z-[1] border-b border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]";
export const td = "border-b border-[var(--color-border)] px-3 py-2 align-middle";

export function Stat({
  label,
  value,
  href,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: number;
  href: string;
  tone?: Tone;
  sub?: string;
}) {
  const bar =
    tone === "critical"
      ? "bg-[var(--color-overdue)]"
      : tone === "warning"
        ? "bg-[var(--color-due)]"
        : tone === "ok"
          ? "bg-[var(--color-on-track)]"
          : "bg-[var(--color-border-strong)]";
  return (
    <Link
      href={href}
      className="group relative block border-r border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 hover:bg-[var(--color-surface-1)]"
    >
      <span className={`absolute inset-x-0 top-0 h-[3px] ${bar}`} aria-hidden />
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">{label}</p>
      <p className="num mt-1 text-[28px] leading-8 font-medium">{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-[var(--color-charcoal)]">{sub}</p>}
    </Link>
  );
}
