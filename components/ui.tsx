import Link from "next/link";
import type { FlagSeverity } from "@/lib/clinical";

export type Tone = "critical" | "warning" | "ok" | "info" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  critical: "bg-[var(--color-overdue-surface)] text-[var(--color-overdue)]",
  warning: "bg-[var(--color-due-surface)] text-[var(--color-due)]",
  ok: "bg-[var(--color-on-track-surface)] text-[var(--color-on-track)]",
  info: "bg-[var(--color-info-surface)] text-[var(--color-info)]",
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-charcoal)]",
};

const TONE_DOT: Record<Tone, string> = {
  critical: "bg-[var(--color-overdue)]",
  warning: "bg-[var(--color-due)]",
  ok: "bg-[var(--color-on-track)]",
  info: "bg-[var(--color-info)]",
  neutral: "bg-[var(--color-charcoal)]",
};

export const SEVERITY_TONE: Record<FlagSeverity, Tone> = { critical: "critical", warning: "warning", info: "info" };

/** Status pill. Colour is never the only signal — always a text label plus dot. */
export function Tag({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-5 ${TONE_CLASS[tone]}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
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
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-3 px-4 pb-2 pt-6 md:px-8 md:pt-9">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] md:text-[30px]">{title}</h1>
        {meta && <div className="mt-1 text-[13px] text-[var(--color-charcoal)]">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Standard page body container, aligned with PageHeader. */
export const pageBody = "mx-auto w-full max-w-6xl space-y-5 px-4 pb-12 pt-4 md:px-8";

export const card =
  "rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[0_1px_2px_rgb(34_27_43/0.04),0_10px_30px_-18px_rgb(62_42_92/0.18)]";

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
    <section className={`overflow-hidden ${card} ${className}`}>
      <div className="flex min-h-12 items-center justify-between gap-2 px-4 pt-1">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-foreground)]">
          {title}
          {count !== undefined && (
            <span className="num rounded-full bg-[var(--color-primary-surface)] px-2 text-[12px] font-semibold leading-5 text-[var(--color-primary)]">
              {count}
            </span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-center text-[13px] text-[var(--color-charcoal)]">{children}</p>;
}

export const buttonPrimary =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--radius-buttons)] bg-[var(--color-primary)] px-4 text-[14px] font-semibold text-[var(--color-primary-foreground)] shadow-[0_6px_16px_-8px_rgb(62_42_92/0.6)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50";
export const buttonSecondary =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 text-[14px] font-medium text-[var(--color-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50";

export const th =
  "sticky top-0 z-[1] border-y border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-2.5 text-left text-[12px] font-medium text-[var(--color-charcoal)]";
export const td = "border-b border-[var(--color-border)]/70 px-4 py-3 align-middle";

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
  return (
    <Link
      href={href}
      className={`group block px-4 py-4 transition-[transform,box-shadow] duration-200 hover:shadow-[0_16px_36px_-18px_rgb(62_42_92/0.35)] motion-safe:hover:-translate-y-0.5 ${card}`}
    >
      <p className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-charcoal)]">
        <span aria-hidden className={`h-2 w-2 rounded-full ${TONE_DOT[tone]}`} />
        {label}
      </p>
      <p className="num mt-1.5 text-[28px] font-semibold leading-8">{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-[var(--color-charcoal)]">{sub}</p>}
    </Link>
  );
}

/** Pill filter chip (use with aria-pressed or role="tab" + aria-selected). */
export function chipClass(active: boolean): string {
  return `inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors duration-150 ${
    active
      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
      : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
  }`;
}

export function chipCountClass(active: boolean): string {
  return `num rounded-full px-1.5 text-[11px] font-semibold leading-[18px] ${
    active ? "bg-white/20 text-white" : "bg-[var(--color-primary-surface)] text-[var(--color-primary)]"
  }`;
}

/** Text input / select base style. */
export const inputClass =
  "min-h-11 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px]";

export const labelClass = "mb-1.5 block text-[13px] font-medium text-[var(--color-charcoal)]";
