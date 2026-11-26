import Link from "next/link";
import type { FlagSeverity } from "@/lib/clinical";

/*
  MatruSetu UI primitives. See DESIGN.md for the rules these encode.
  Server-safe (no hooks): import from server and client components alike.
*/

export type Tone = "critical" | "warning" | "ok" | "info" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  critical: "bg-[var(--color-overdue-surface)] text-[var(--color-overdue)]",
  warning: "bg-[var(--color-due-surface)] text-[var(--color-due)]",
  ok: "bg-[var(--color-on-track-surface)] text-[var(--color-on-track)]",
  info: "bg-[var(--color-info-surface)] text-[var(--color-info)]",
  neutral: "bg-[var(--color-surface-2)] text-[var(--color-charcoal)]",
};

export const TONE_DOT: Record<Tone, string> = {
  critical: "bg-[var(--color-overdue)]",
  warning: "bg-[var(--color-due)]",
  ok: "bg-[var(--color-on-track)]",
  info: "bg-[var(--color-info)]",
  neutral: "bg-[var(--color-charcoal)]",
};

/** Text colour per tone, for counts and inline status words. */
export const TONE_TEXT: Record<Tone, string> = {
  critical: "text-[var(--color-overdue)]",
  warning: "text-[var(--color-due)]",
  ok: "text-[var(--color-on-track)]",
  info: "text-[var(--color-info)]",
  neutral: "text-[var(--color-charcoal)]",
};

export const SEVERITY_TONE: Record<FlagSeverity, Tone> = { critical: "critical", warning: "warning", info: "info" };

/** Status pill. Colour is never the only signal: always a text label plus dot. */
export function Tag({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold leading-5 ${TONE_CLASS[tone]}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
      {children}
    </span>
  );
}

/** Leading status dot for list rows: pair with a visible label or an sr-only one. */
export function StatusDot({ tone, label }: { tone: Tone; label?: string }) {
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${TONE_DOT[tone]}`} />
      {label && <span className="sr-only">{label}</span>}
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
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-x-4 gap-y-3 px-4 pb-1 pt-5 md:px-8 md:pt-7">
      <div className="min-w-0">
        <h1 className="text-balance text-[22px] font-semibold leading-tight tracking-[-0.015em] md:text-[24px]">{title}</h1>
        {meta && <div className="mt-1 text-[13px] text-[var(--color-charcoal)]">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Standard page body container, aligned with PageHeader. */
export const pageBody = "mx-auto w-full max-w-6xl space-y-4 px-4 pb-12 pt-4 md:space-y-5 md:px-8";

export const card =
  "rounded-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-card)]";

/** Linked card: lifts on pointer hover only. */
export const cardLink = `${card} block transition-[box-shadow,border-color,transform] duration-200 ease-[var(--ease-out)] hover:border-[var(--color-pc-lilac-strong)] [@media(hover:hover)]:hover:-translate-y-px`;

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
      <div className="flex min-h-12 items-center justify-between gap-2 border-b border-[var(--color-border)]/70 px-4">
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

export function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <p className="max-w-sm text-[14px] text-[var(--color-charcoal)]">{children}</p>
      {action}
    </div>
  );
}

const buttonBase =
  "press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-buttons)] px-4 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 md:min-h-10";

export const buttonPrimary = `${buttonBase} bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[0_1px_2px_rgb(34_27_43/0.12),0_6px_14px_-8px_rgb(62_42_92/0.55)] hover:bg-[var(--color-primary-hover)]`;
export const buttonSecondary = `${buttonBase} border border-[var(--color-border-strong)]/60 bg-[var(--color-background)] font-medium text-[var(--color-foreground)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]`;
export const buttonGhost = `${buttonBase} font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-surface)]`;
export const buttonDanger = `${buttonBase} border border-[var(--color-overdue)]/40 bg-[var(--color-background)] text-[var(--color-overdue)] hover:bg-[var(--color-overdue-surface)]`;
/** Square icon button; always give it an aria-label. */
export const iconButton =
  "press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-buttons)] text-[var(--color-charcoal)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50 md:h-10 md:w-10";

export const th =
  "sticky top-0 z-[1] border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-2.5 text-left text-[12px] font-semibold text-[var(--color-charcoal)]";
export const td = "border-b border-[var(--color-border)]/70 px-4 py-3 align-middle";

/** Clickable list row (worklist, patients, calls): full-width hit area, tinted hover. */
export const rowLink =
  "flex min-h-14 items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[var(--color-surface-1)] focus-visible:-outline-offset-2";

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
    <Link href={href} className={`group px-4 py-3.5 ${cardLink}`}>
      <p className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-charcoal)]">
        <span aria-hidden className={`h-2 w-2 rounded-full ${TONE_DOT[tone]}`} />
        {label}
      </p>
      <p className={`num mt-1 text-[26px] font-semibold leading-8 ${value > 0 && tone !== "neutral" ? TONE_TEXT[tone] : ""}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[12px] text-[var(--color-charcoal)]">{sub}</p>}
    </Link>
  );
}

/** Pill filter chip (use with aria-pressed or role="tab" + aria-selected). */
export function chipClass(active: boolean): string {
  return `press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium md:min-h-9 ${
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

/** Text input / select base style. 16px on phones avoids iOS zoom-on-focus. */
export const inputClass =
  "min-h-11 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[16px] placeholder:text-[var(--color-charcoal)]/80 md:text-[15px]";

export const labelClass = "mb-1.5 block text-[13px] font-medium text-[var(--color-charcoal)]";

/** Small field-level help or error under an input. */
export const helpClass = "mt-1 text-[12px] text-[var(--color-charcoal)]";
export const errorClass = "mt-1 text-[12px] font-medium text-[var(--color-overdue)]";

/** Label/value pair for clinical facts (GA, EDD, BP, Hb). Use inside a <dl>. */
export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-[var(--color-charcoal)]">{label}</dt>
      <dd className="num mt-0.5 truncate text-[15px] font-semibold text-[var(--color-foreground)]">{children}</dd>
    </div>
  );
}

/**
 * Patient identity strip: the one header every patient screen shares.
 * `facts` render in order as a definition list; keep to 3-5.
 */
export function IdentityStrip({
  name,
  subtitle,
  status,
  facts,
  actions,
}: {
  name: string;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  facts?: { label: string; value: React.ReactNode }[];
  actions?: React.ReactNode;
}) {
  return (
    <section className={`${card} px-4 py-4 md:px-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-[22px] font-semibold leading-tight tracking-[-0.015em]">{name}</h1>
            {status}
          </div>
          {subtitle && <div className="mt-1 text-[13px] text-[var(--color-charcoal)]">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {facts && facts.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--color-border)]/70 pt-3 sm:grid-cols-3 lg:grid-cols-5">
          {facts.map((f) => (
            <Fact key={f.label} label={f.label}>
              {f.value}
            </Fact>
          ))}
        </dl>
      )}
    </section>
  );
}

/**
 * Mobile primary-action bar: pinned above the bottom nav below md, inline at md+.
 * Pages using it add `pb-24 md:pb-12` to their body so content clears it.
 */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[var(--mobile-nav-height)] z-20 flex gap-2 border-t border-[var(--color-border)] bg-[var(--color-background)]/95 px-4 py-2.5 md:static md:z-auto md:border-0 md:bg-transparent md:p-0 print:hidden [&>*]:flex-1 md:[&>*]:flex-none">
      {children}
    </div>
  );
}

/** Section heading inside a page body (h2). */
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-2 pt-2">
      <h2 className="text-[15px] font-semibold text-[var(--color-foreground)]">{children}</h2>
      {action}
    </div>
  );
}
