// TEMPORARY — palette exploration for the Today page redesign.
// Renders identical static sample UI in each candidate palette. No data access.
// Delete this folder once a palette is chosen.
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Baby, CaretDown, Phone, PhoneCall, UserPlus } from "@phosphor-icons/react/dist/ssr";
import { PALETTES, STATUS_LABEL, contrastChecks, type Palette, type StatusKey } from "./palettes";

export const metadata: Metadata = {
  title: "Palette preview · MatruSetu",
  robots: { index: false, follow: false },
};

const STATUS_ORDER: StatusKey[] = ["atRisk", "overdue", "active", "delivered"];
const WEEK = [
  { d: "Mon", n: 28, c: 6 },
  { d: "Tue", n: 29, c: 9 },
  { d: "Wed", n: 30, c: 4 },
  { d: "Thu", n: 1, c: 11 },
  { d: "Fri", n: 2, c: 14 },
  { d: "Sat", n: 3, c: 3 },
  { d: "Sun", n: 4, c: 0 },
];
const SELECTED_DAY = 4;

function paletteVars(p: Palette): CSSProperties {
  const vars: Record<`--${string}`, string> = {
    "--p-bg": p.background,
    "--p-bg-to": p.backgroundTo,
    "--p-surface": p.surface,
    "--p-border": p.border,
    "--p-primary": p.primary,
    "--p-primary-hover": p.primaryHover,
    "--p-on-primary": p.onPrimary,
    "--p-accent": p.accent,
    "--p-accent-text": p.accentText,
    "--p-text": p.text,
    "--p-muted": p.muted,
  };
  return vars as CSSProperties;
}

const glass =
  "border border-[color-mix(in_srgb,var(--p-border)_70%,white)] bg-[color-mix(in_srgb,var(--p-surface)_78%,transparent)] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] backdrop-blur-md";

function Badge({ p, k }: { p: Palette; k: StatusKey }) {
  const s = p.status[k];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-5"
      style={{ color: s.fg, background: s.bg }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: s.fg }} />
      {STATUS_LABEL[k]}
    </span>
  );
}

function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="h-5 w-5 shrink-0 rounded-md border border-black/10" style={{ background: hex }} aria-hidden />
      <span className="text-[var(--p-muted)]">{label}</span>
      <span className="num ml-auto text-[var(--p-text)]">{hex}</span>
    </div>
  );
}

function PaletteColumn({ p }: { p: Palette }) {
  const checks = contrastChecks(p);
  const minRatio = Math.min(...checks.map((c) => c.ratio));

  return (
    <section
      aria-labelledby={`${p.id}-title`}
      style={paletteVars(p)}
      className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-black/5 text-[var(--p-text)]"
    >
      {/* Canvas: soft gradient + two blurred shapes, no imagery */}
      <div className="relative isolate flex flex-1 flex-col gap-4 bg-[linear-gradient(160deg,var(--p-bg)_0%,var(--p-bg-to)_100%)] p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 -z-10 h-48 w-48 rounded-full bg-[var(--p-accent)] opacity-70 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 -z-10 h-48 w-48 rounded-full bg-[var(--p-primary)] opacity-10 blur-3xl"
        />

        <header>
          <h2 id={`${p.id}-title`} className="text-[17px]">
            {p.name}
          </h2>
          <p className="text-[12px] text-[var(--p-muted)]">{p.tagline}</p>
        </header>

        {/* Week strip */}
        <div className={`${glass} grid grid-cols-7 gap-1 rounded-2xl p-1.5`}>
          {WEEK.map((day, i) => {
            const sel = i === SELECTED_DAY;
            return (
              <div
                key={day.d}
                className={`flex flex-col items-center gap-0.5 rounded-full py-2 ${
                  sel ? "bg-[var(--p-primary)] text-[var(--p-on-primary)]" : "text-[var(--p-muted)]"
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide">{day.d}</span>
                <span className={`num text-[14px] font-medium ${sel ? "" : "text-[var(--p-text)]"}`}>{day.n}</span>
                <span
                  className={`num min-w-4 rounded-full px-1 text-center text-[10px] leading-4 ${
                    sel
                      ? "bg-[var(--p-on-primary)] text-[var(--p-primary)]"
                      : day.c > 0
                        ? "bg-[var(--p-accent)] text-[var(--p-accent-text)]"
                        : "opacity-0"
                  }`}
                >
                  {day.c}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hero stat */}
        <div
          className={`${glass} relative overflow-hidden rounded-3xl p-5`}
          style={{
            backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${p.accent} 70%, transparent), transparent 65%)`,
          }}
        >
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--p-muted)]">Patients due today</p>
          <p className="num mt-1 text-[56px] font-medium leading-none tracking-tight">14</p>
          <div className="mt-4 flex gap-5 text-[13px]">
            <div>
              <p className="num text-[18px] font-semibold" style={{ color: p.status.overdue.fg }}>
                3
              </p>
              <p className="text-[var(--p-muted)]">Overdue</p>
            </div>
            <div>
              <p className="num text-[18px] font-semibold" style={{ color: p.status.atRisk.fg }}>
                2
              </p>
              <p className="text-[var(--p-muted)]">At risk</p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_ORDER.map((k) => (
            <Badge key={k} p={p} k={k} />
          ))}
        </div>

        {/* Filter chips + buttons */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sample filter chips">
          {["All", "At risk", "Overdue", "Due today"].map((c, i) => (
            <button
              key={c}
              type="button"
              aria-pressed={i === 0}
              style={{ borderRadius: 9999 }}
              className={`min-h-9 border px-3 text-[13px] font-medium transition-colors ${
                i === 0
                  ? "border-[var(--p-primary)] bg-[var(--p-primary)] text-[var(--p-on-primary)]"
                  : "border-[var(--p-border)] bg-[var(--p-surface)] text-[var(--p-text)] hover:border-[var(--p-primary)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            style={{ borderRadius: 14 }}
            className="inline-flex min-h-11 items-center gap-2 bg-[var(--p-primary)] px-4 text-[14px] font-semibold text-[var(--p-on-primary)] transition-colors hover:bg-[var(--p-primary-hover)]"
          >
            <UserPlus size={18} aria-hidden /> New patient
          </button>
          <button
            type="button"
            style={{ borderRadius: 14 }}
            className="inline-flex min-h-11 items-center gap-2 border border-[var(--p-border)] bg-[var(--p-surface)] px-4 text-[14px] font-medium text-[var(--p-text)] transition-colors hover:border-[var(--p-primary)]"
          >
            <Phone size={18} aria-hidden /> Start calls
          </button>
        </div>

        {/* Quick-action tiles (icon only, labelled for AT) */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { Icon: UserPlus, label: "Register patient" },
            { Icon: PhoneCall, label: "Call queue" },
            { Icon: Baby, label: "Record delivery" },
          ].map(({ Icon, label }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              style={{ borderRadius: 20 }}
              className={`${glass} flex aspect-[4/3] items-center justify-center text-[var(--p-primary)] transition-transform hover:-translate-y-0.5`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--p-accent)] text-[var(--p-accent-text)]">
                <Icon size={22} aria-hidden />
              </span>
            </button>
          ))}
        </div>

        {/* Worklist rows: one collapsed, one expanded */}
        <div className={`${glass} divide-y divide-[var(--p-border)] overflow-hidden rounded-2xl`}>
          <div className="flex items-center gap-3 px-3 py-3">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--p-accent)] text-[13px] font-semibold text-[var(--p-accent-text)]"
            >
              SP
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium">Sunita Pawar</p>
              <p className="num text-[12px] text-[var(--p-muted)]">28w 3d · T3 · 26y</p>
            </div>
            <Badge p={p} k="overdue" />
            <CaretDown size={16} aria-hidden className="text-[var(--p-muted)]" />
          </div>
          <div className="bg-[color-mix(in_srgb,var(--p-accent)_35%,transparent)] px-3 py-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--p-accent)] text-[13px] font-semibold text-[var(--p-accent-text)]"
              >
                MK
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">Meena Kale</p>
                <p className="num text-[12px] text-[var(--p-muted)]">34w 1d · T3 · 31y</p>
              </div>
              <Badge p={p} k="atRisk" />
              <CaretDown size={16} aria-hidden className="rotate-180 text-[var(--p-muted)]" />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <dt className="text-[var(--p-muted)]">Last visit</dt>
                <dd className="num">12 Sep 2026</dd>
              </div>
              <div>
                <dt className="text-[var(--p-muted)]">Next ANC due</dt>
                <dd className="num">2 Oct 2026</dd>
              </div>
            </dl>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                style={{ borderRadius: 12 }}
                className="inline-flex min-h-10 items-center gap-1.5 bg-[var(--p-primary)] px-3 text-[13px] font-semibold text-[var(--p-on-primary)]"
              >
                <Phone size={15} aria-hidden /> Call
              </button>
              <button
                type="button"
                style={{ borderRadius: 12 }}
                className="inline-flex min-h-10 items-center border border-[var(--p-border)] bg-[var(--p-surface)] px-3 text-[13px] font-medium"
              >
                Open record
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tokens + contrast */}
      <div className="space-y-3 bg-[var(--p-surface)] p-4">
        <div className="space-y-1.5">
          <Swatch hex={p.background} label="Background" />
          <Swatch hex={p.surface} label="Surface" />
          <Swatch hex={p.primary} label="Primary" />
          <Swatch hex={p.accent} label="Accent" />
          <Swatch hex={p.text} label="Text" />
          <Swatch hex={p.muted} label="Muted text" />
        </div>
        <details className="text-[12px]">
          <summary className="cursor-pointer font-medium">
            Contrast — lowest <span className="num">{minRatio.toFixed(2)}:1</span>{" "}
            {minRatio >= 4.5 ? "(all AA)" : "(fails AA)"}
          </summary>
          <table className="mt-2 w-full">
            <tbody>
              {checks.map((c) => (
                <tr key={c.label}>
                  <td className="py-0.5 text-[var(--p-muted)]">{c.label}</td>
                  <td className="py-0.5 text-right">
                    <span className="num rounded px-1.5" style={{ color: c.fg, background: c.bg }}>
                      {c.ratio.toFixed(2)}
                    </span>
                  </td>
                  <td className="w-10 py-0.5 text-right">{c.ratio >= 7 ? "AAA" : c.ratio >= 4.5 ? "AA" : "fail"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </section>
  );
}

export default function PalettePreviewPage() {
  return (
    <main className="min-h-dvh bg-[#fafafa] p-4 md:p-6">
      <header className="mb-5 max-w-3xl">
        <h1 className="text-[22px]">Palette preview</h1>
        <p className="text-[13px] text-[var(--color-charcoal)]">
          Temporary page. Same sample UI in five candidate palettes for the Today redesign. Static data only. Hover the
          buttons and tiles to see states; open “Contrast” under each palette for WCAG ratios.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {PALETTES.map((p) => (
          <PaletteColumn key={p.id} p={p} />
        ))}
      </div>
    </main>
  );
}
