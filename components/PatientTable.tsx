"use client";

import { hasOverdueItems, isAtRisk, isLost } from "@/lib/followUp";

import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, CaretUp, CaretDown, Plus } from "@phosphor-icons/react";
import { Tag, StatusDot, Empty, SEVERITY_TONE, th, td, card, rowLink, buttonPrimary, buttonSecondary, chipClass, chipCountClass, type Tone } from "@/components/ui";
import type { ClinicalFlag } from "@/lib/clinical";
import type { FollowUpRisk } from "@/lib/supabase/enums";
import { PAGE_SIZE, nextLimit, remainingCount } from "@/lib/paging";
import { useT } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { flagLabel } from "@/lib/clinical";

export interface PatientListRow {
  id: string;
  name: string;
  phone: string | null;
  clinicNo: string | null;
  age: number | null;
  gp: string;
  gaDays: number | null;
  gaLabel: string;
  trimester: 1 | 2 | 3 | null;
  edd: string | null;
  eddLabel: string;
  eddInDays: number | null;
  nextVisit: string | null;
  nextVisitLabel: string;
  risk: FollowUpRisk;
  overdueCount: number;
  flags: ClinicalFlag[];
  createdAt: string | null;
}

export type PatientFilter = "all" | "t1" | "t2" | "t3" | "overdue" | "at_risk" | "lost" | "alerts" | "term";

const FILTERS: { id: PatientFilter; label: MessageKey; test: (r: PatientListRow) => boolean }[] = [
  { id: "all", label: "patients.filter.all", test: () => true },
  { id: "t1", label: "patients.filter.t1", test: (r) => r.trimester === 1 },
  { id: "t2", label: "patients.filter.t2", test: (r) => r.trimester === 2 },
  { id: "t3", label: "patients.filter.t3", test: (r) => r.trimester === 3 },
  { id: "overdue", label: "patients.filter.overdue", test: (r) => hasOverdueItems(r.overdueCount) },
  { id: "at_risk", label: "patients.filter.atRisk", test: (r) => isAtRisk(r.risk) },
  { id: "lost", label: "patients.filter.lost", test: (r) => isLost(r.risk) },
  { id: "alerts", label: "patients.filter.alerts", test: (r) => r.flags.some((f) => f.severity !== "info") },
  { id: "term", label: "patients.filter.term", test: (r) => r.eddInDays !== null && r.eddInDays <= 30 },
];

type SortKey = "name" | "ga" | "edd" | "next" | "recent";

const RISK: Record<FollowUpRisk, { tone: Tone; label: MessageKey }> = {
  on_track: { tone: "ok", label: "patients.risk.onTrack" },
  at_risk: { tone: "warning", label: "patients.risk.atRisk" },
  lost: { tone: "critical", label: "patients.risk.lost" },
};

function compare(a: PatientListRow, b: PatientListRow, key: SortKey): number {
  const nullsLast = (x: string | number | null, y: string | number | null) => {
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x < y ? -1 : 1;
  };
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "ga":
      return nullsLast(a.gaDays, b.gaDays);
    case "edd":
      return nullsLast(a.edd, b.edd);
    case "next":
      return nullsLast(a.nextVisit, b.nextVisit);
    case "recent":
      return nullsLast(a.createdAt, b.createdAt);
  }
}


function isRecentlyAdded(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff >= 0 && diff < 24 * 60 * 60 * 1000;
}

const PatientRow = memo(function PatientRow({
  r,
  onOpen,
  onHover,
}: {
  r: PatientListRow;
  onOpen: (id: string) => void;
  onHover: (id: string) => void;
}) {
  const t = useT();
  return (
    <tr
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) return;
        onOpen(r.id);
      }}
      onMouseEnter={() => onHover(r.id)}
      className="cursor-pointer hover:bg-[var(--color-surface-1)]"
    >
      <td className={td}>
        <div className="flex items-center gap-3">
          <StatusDot tone={rowTone(r)} label={t(RISK[r.risk].label)} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/patients/${r.id}`} prefetch={true} className="inline-flex min-h-10 items-center font-semibold hover:underline">
                {r.name}
              </Link>
              {isRecentlyAdded(r.createdAt) && (
                <span className="rounded-md border border-[var(--color-on-track)]/30 bg-[var(--color-on-track-surface)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-on-track)]">
                  {t("patients.table.new")}
                </span>
              )}
            </div>
            <span className="num block whitespace-nowrap text-[12px] text-[var(--color-charcoal)]">
              {[r.clinicNo && `#${r.clinicNo}`, r.phone].filter(Boolean).join(" · ") || "—"}
            </span>
          </div>
        </div>
      </td>
      <td className={`${td} num whitespace-nowrap`}>
        {r.age ?? "—"} <span className="text-[var(--color-charcoal)]">· {r.gp}</span>
      </td>
      <td className={`${td} num whitespace-nowrap`}>
        {r.gaLabel}
        {r.trimester && (
          <span className="ml-1.5 text-[12px] text-[var(--color-charcoal)]">
            {t("patients.trimesterShort", { trimester: r.trimester })}
          </span>
        )}
      </td>
      <td className={`${td} num whitespace-nowrap`}>
        {r.eddLabel}
        {r.eddInDays !== null && r.eddInDays <= 30 && (
          <span className={`ml-1.5 text-[12px] ${r.eddInDays < 0 ? "text-[var(--color-overdue)]" : "text-[var(--color-on-track)]"}`}>
            {r.eddInDays < 0 ? t("patients.daysPast", { count: -r.eddInDays }) : t("patients.daysShort", { count: r.eddInDays })}
          </span>
        )}
      </td>
      <td className={`${td} num hidden whitespace-nowrap lg:table-cell`}>{r.nextVisitLabel}</td>
      <td className={td}>
        <RiskTags r={r} />
      </td>
    </tr>
  );
});

function rowTone(r: PatientListRow): Tone {
  return r.overdueCount > 0 && r.risk === "on_track" ? "warning" : RISK[r.risk].tone;
}

function RiskTags({ r }: { r: PatientListRow }) {
  const t = useT();
  const alerts = r.flags.filter((f) => f.severity !== "info");
  const room = r.overdueCount > 0 ? 0 : 1;
  const extra = alerts.length - room;
  return (
    <div className="flex flex-wrap gap-1">
      <Tag tone={RISK[r.risk].tone}>{t(RISK[r.risk].label)}</Tag>
      {r.overdueCount > 0 && <Tag tone="warning">{t("patients.table.overdueCount", { count: r.overdueCount })}</Tag>}
      {alerts.slice(0, room).map((f) => (
        <Tag key={f.code} tone={SEVERITY_TONE[f.severity]}>
          {flagLabel(f, t)}
        </Tag>
      ))}
      {extra > 0 && (
        <span
          className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-2 text-[12px] font-medium leading-6 text-[var(--color-charcoal)]"
          title={alerts.slice(room).map((f) => flagLabel(f, t)).join(", ")}
        >
          {t("patients.table.moreAlerts", { count: extra })}
        </span>
      )}
    </div>
  );
}

/** Phone row: full-row link, status dot first, GA and EDD as the deciding facts. */
const PatientCardRow = memo(function PatientCardRow({ r }: { r: PatientListRow }) {
  const t = useT();
  return (
    <li className="border-b border-[var(--color-border)]/70 last:border-b-0">
      <Link href={`/patients/${r.id}`} prefetch={true} className={`${rowLink} items-start`}>
        <span className="mt-0.5">
          <StatusDot tone={rowTone(r)} label={t(RISK[r.risk].label)} />
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">{r.name}</span>
            {isRecentlyAdded(r.createdAt) && (
              <span className="shrink-0 rounded-md border border-[var(--color-on-track)]/30 bg-[var(--color-on-track-surface)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-on-track)]">
                {t("patients.table.new")}
              </span>
            )}
          </span>
          <span className="num block text-[13px] text-[var(--color-charcoal)]">
            {[r.gaLabel, r.eddLabel, r.phone].filter((x) => x && x !== "—").join(" · ") || "—"}
          </span>
          <RiskTags r={r} />
        </span>
      </Link>
    </li>
  );
});

export function PatientTable({ rows, initialFilter }: { rows: PatientListRow[]; initialFilter: PatientFilter }) {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PatientFilter>(initialFilter);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "recent", dir: -1 });

  const [limitState, setLimitState] = useState({ key: "", limit: PAGE_SIZE });

  const openPatient = useCallback((id: string) => router.push(`/patients/${id}`), [router]);
  const prefetchPatient = useCallback((id: string) => router.prefetch(`/patients/${id}`), [router]);

  // Input/chips/sort stay instant; the heavy filtered list follows deferred values.
  const deferredQuery = useDeferredValue(query);
  const deferredFilter = useDeferredValue(filter);
  const deferredSort = useDeferredValue(sort);
  const isStale = deferredQuery !== query || deferredFilter !== filter || deferredSort !== sort;

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, rows.filter(f.test).length])), [rows]);

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const test = FILTERS.find((f) => f.id === deferredFilter)?.test ?? (() => true);
    return rows
      .filter(test)
      .filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          (digits.length >= 3 && (r.phone ?? "").includes(digits)) ||
          (r.clinicNo ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => compare(a, b, deferredSort.key) * deferredSort.dir);
  }, [rows, deferredQuery, deferredFilter, deferredSort]);

  // Reset paging whenever the (deferred) search or filter changes.
  const resetKey = `${deferredFilter}\u0000${deferredQuery}`;
  if (limitState.key !== resetKey) setLimitState({ key: resetKey, limit: PAGE_SIZE });
  const limit = limitState.key === resetKey ? limitState.limit : PAGE_SIZE;
  const shown = useMemo(() => visible.slice(0, limit), [visible, limit]);
  const remaining = remainingCount(visible.length, limit);

  const sortHeader = (key: SortKey, label: string, className = "") => (
    <th className={`${th} ${className}`} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md hover:text-[var(--color-foreground)]"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <CaretUp size={10} weight="bold" aria-hidden /> : <CaretDown size={10} weight="bold" aria-hidden />)}
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      <label className="flex min-h-12 w-full items-center gap-2.5 rounded-[var(--radius-cards)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-4 shadow-[var(--shadow-card)] transition-shadow focus-within:border-[var(--color-primary)] focus-within:shadow-[0_0_0_3px_var(--color-pc-lilac)] md:max-w-xl">
        <MagnifyingGlass size={18} className="shrink-0 text-[var(--color-charcoal)]" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("patients.table.searchPlaceholder")}
          aria-label={t("patients.table.searchLabel")}
          className="min-h-11 flex-1 border-0 bg-transparent text-[16px] shadow-none outline-none focus:shadow-none md:text-[15px]"
        />
      </label>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label={t("patients.table.filterLabel")}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={chipClass(filter === f.id)}
          >
            {t(f.label)} <span className={chipCountClass(filter === f.id)}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <div className={`overflow-hidden ${card}`}>
        <div className={`transition-opacity ${isStale ? "opacity-60" : ""}`} aria-busy={isStale}>
          {visible.length > 0 && (
            <>
              <div className="hidden max-h-[calc(100dvh-16rem)] overflow-auto md:block">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr>
                      {sortHeader("name", t("patients.table.colPatient"))}
                      <th className={th}>{t("patients.table.colAgeGp")}</th>
                      {sortHeader("ga", t("patients.table.colGa"))}
                      {sortHeader("edd", t("patients.table.colEdd"))}
                      {sortHeader("next", t("patients.table.colNextVisit"), "hidden lg:table-cell")}
                      <th className={th}>{t("patients.table.colStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <PatientRow key={r.id} r={r} onOpen={openPatient} onHover={prefetchPatient} />
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="md:hidden">
                {shown.map((r) => (
                  <PatientCardRow key={r.id} r={r} />
                ))}
              </ul>
            </>
          )}
          {visible.length === 0 &&
            (rows.length === 0 ? (
              <Empty
                action={
                  <Link href="/patients/new" className={buttonPrimary}>
                    <Plus size={15} weight="bold" aria-hidden /> {t("patients.newPatient")}
                  </Link>
                }
              >
                {t("patients.table.emptyNone")}
              </Empty>
            ) : (
              <Empty
                action={
                  <button
                    type="button"
                    className={buttonSecondary}
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                  >
                    {t("patients.table.clearFilters")}
                  </button>
                }
              >
                {t("patients.table.emptyNoMatch")}
              </Empty>
            ))}
        </div>
        {remaining > 0 && (
          <div className="border-t border-[var(--color-border)]/70 px-4 py-3 text-center">
            <button
              type="button"
              onClick={() => setLimitState((s) => ({ ...s, limit: nextLimit(s.limit, visible.length) }))}
              className={buttonSecondary}
            >
              {t("patients.table.showMore", { count: remaining })}
            </button>
          </div>
        )}
        <p className="num border-t border-[var(--color-border)]/70 px-4 py-3 text-[12px] text-[var(--color-charcoal)]" aria-live="polite">
          {visible.length !== rows.length
            ? t("patients.table.showingMatching", { shown: shown.length, visible: visible.length, total: rows.length })
            : t("patients.table.showing", { shown: shown.length, visible: visible.length })}
        </p>
      </div>
    </div>
  );
}
