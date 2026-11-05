"use client";

import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, CaretUp, CaretDown } from "@phosphor-icons/react";
import { Tag, SEVERITY_TONE, th, td, card, chipClass, chipCountClass, type Tone } from "@/components/ui";
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
  { id: "overdue", label: "patients.filter.overdue", test: (r) => r.overdueCount > 0 },
  { id: "at_risk", label: "patients.filter.atRisk", test: (r) => r.risk === "at_risk" },
  { id: "lost", label: "patients.filter.lost", test: (r) => r.risk === "lost" },
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
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-surface)] text-[12px] font-semibold text-[var(--color-primary)]"
          >
            {r.name
              .split(/\s+/)
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/patients/${r.id}`} prefetch={true} className="block font-semibold hover:underline">
                {r.name}
              </Link>
              {isRecentlyAdded(r.createdAt) && (
                <span className="rounded-md bg-[var(--color-on-track-surface)] border border-[var(--color-on-track)]/30 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-on-track)] tracking-wide">
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
      <td className={`${td} num hidden whitespace-nowrap sm:table-cell`}>
        {r.age ?? "—"} <span className="text-[var(--color-charcoal)]">· {r.gp}</span>
      </td>
      <td className={`${td} num`}>
        {r.gaLabel}
        {r.trimester && (
          <span className="ml-1.5 text-[12px] text-[var(--color-charcoal)]">
            {t("patients.trimesterShort", { trimester: r.trimester })}
          </span>
        )}
      </td>
      <td className={`${td} num hidden whitespace-nowrap sm:table-cell`}>
        {r.eddLabel}
        {r.eddInDays !== null && r.eddInDays <= 30 && (
          <span className={`ml-1.5 text-[12px] ${r.eddInDays < 0 ? "text-[var(--color-overdue)]" : "text-[var(--color-on-track)]"}`}>
            {r.eddInDays < 0 ? t("patients.daysPast", { count: -r.eddInDays }) : t("patients.daysShort", { count: r.eddInDays })}
          </span>
        )}
      </td>
      <td className={`${td} num hidden md:table-cell`}>{r.nextVisitLabel}</td>
      <td className={td}>
        <div className="flex flex-wrap gap-1">
          <Tag tone={RISK[r.risk].tone}>{t(RISK[r.risk].label)}</Tag>
          {r.overdueCount > 0 && <Tag tone="warning">{t("patients.table.overdueCount", { count: r.overdueCount })}</Tag>}
          {(() => {
            const alerts = r.flags.filter((f) => f.severity !== "info");
            const room = r.overdueCount > 0 ? 0 : 1;
            const extra = alerts.length - room;
            return (
              <>
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
              </>
            );
          })()}
        </div>
      </td>
    </tr>
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
        {sort.key === key && (sort.dir === 1 ? <CaretUp size={10} weight="bold" /> : <CaretDown size={10} weight="bold" />)}
      </button>
    </th>
  );

  return (
    <div className={`overflow-hidden ${card}`}>
      <div className="space-y-3 p-4">
        <label className="flex min-h-11 w-full max-w-md items-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 transition-shadow focus-within:border-[var(--color-primary)] focus-within:shadow-[0_0_0_3px_var(--color-pc-lilac)]">
          <MagnifyingGlass size={16} className="text-[var(--color-charcoal)]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("patients.table.searchPlaceholder")}
            aria-label={t("patients.table.searchLabel")}
            className="min-h-10 flex-1 border-0 bg-transparent text-[14px] shadow-none outline-none focus:shadow-none"
          />
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label={t("patients.table.filterLabel")}>
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
      </div>

      <div className={`overflow-x-auto transition-opacity ${isStale ? "opacity-60" : ""}`} aria-busy={isStale}>
        <table className="w-full text-[14px]">
          <thead>
            <tr>
              {sortHeader("name", t("patients.table.colPatient"))}
              <th className={`${th} hidden sm:table-cell`}>{t("patients.table.colAgeGp")}</th>
              {sortHeader("ga", t("patients.table.colGa"))}
              {sortHeader("edd", t("patients.table.colEdd"), "hidden sm:table-cell")}
              {sortHeader("next", t("patients.table.colNextVisit"), "hidden md:table-cell")}
              <th className={th}>{t("patients.table.colStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <PatientRow key={r.id} r={r} onOpen={openPatient} onHover={prefetchPatient} />
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-[var(--color-charcoal)]">
            {rows.length === 0 ? t("patients.table.emptyNone") : t("patients.table.emptyNoMatch")}
          </p>
        )}
      </div>
      {remaining > 0 && (
        <div className="px-4 pb-2 text-center">
          <button
            type="button"
            onClick={() => setLimitState((s) => ({ ...s, limit: nextLimit(s.limit, visible.length) }))}
            className="min-h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-4 text-[13px] font-medium hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            {t("patients.table.showMore", { count: remaining })}
          </button>
        </div>
      )}
      <p className="num px-4 py-3 text-[12px] text-[var(--color-charcoal)]" aria-live="polite">
        {visible.length !== rows.length
          ? t("patients.table.showingMatching", { shown: shown.length, visible: visible.length, total: rows.length })
          : t("patients.table.showing", { shown: shown.length, visible: visible.length })}
      </p>
    </div>
  );
}
