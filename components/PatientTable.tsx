"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, CaretUp, CaretDown } from "@phosphor-icons/react";
import { Tag, SEVERITY_TONE, th, td, type Tone } from "@/components/ui";
import type { ClinicalFlag } from "@/lib/clinical";
import type { FollowUpRisk } from "@/lib/supabase/enums";

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
}

export type PatientFilter = "all" | "t1" | "t2" | "t3" | "overdue" | "at_risk" | "lost" | "alerts" | "term";

const FILTERS: { id: PatientFilter; label: string; test: (r: PatientListRow) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "t1", label: "T1", test: (r) => r.trimester === 1 },
  { id: "t2", label: "T2", test: (r) => r.trimester === 2 },
  { id: "t3", label: "T3", test: (r) => r.trimester === 3 },
  { id: "overdue", label: "Overdue items", test: (r) => r.overdueCount > 0 },
  { id: "at_risk", label: "At risk", test: (r) => r.risk === "at_risk" },
  { id: "lost", label: "Lost", test: (r) => r.risk === "lost" },
  { id: "alerts", label: "Clinical alerts", test: (r) => r.flags.some((f) => f.severity !== "info") },
  { id: "term", label: "EDD ≤ 30d", test: (r) => r.eddInDays !== null && r.eddInDays <= 30 },
];

type SortKey = "name" | "ga" | "edd" | "next";

const RISK: Record<FollowUpRisk, { tone: Tone; label: string }> = {
  on_track: { tone: "ok", label: "On track" },
  at_risk: { tone: "warning", label: "At risk" },
  lost: { tone: "critical", label: "Lost" },
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
  }
}

export function PatientTable({ rows, initialFilter }: { rows: PatientListRow[]; initialFilter: PatientFilter }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PatientFilter>(initialFilter);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, rows.filter(f.test).length])), [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const test = FILTERS.find((f) => f.id === filter)!.test;
    return rows
      .filter(test)
      .filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          (digits.length >= 3 && (r.phone ?? "").includes(digits)) ||
          (r.clinicNo ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => compare(a, b, sort.key) * sort.dir);
  }, [rows, query, filter, sort]);

  const sortHeader = (key: SortKey, label: string, className = "") => (
    <th className={`${th} ${className}`} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        className="inline-flex items-center gap-1 uppercase hover:text-[var(--color-foreground)]"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <CaretUp size={10} weight="bold" /> : <CaretDown size={10} weight="bold" />)}
      </button>
    </th>
  );

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] p-3">
        <label className="flex min-h-9 w-full max-w-sm items-center gap-2 border border-[var(--color-border-strong)] px-2 focus-within:border-[var(--color-primary)] focus-within:outline focus-within:outline-1 focus-within:outline-[var(--color-primary)]">
          <MagnifyingGlass size={16} className="text-[var(--color-charcoal)]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, clinic no."
            aria-label="Search patients"
            className="min-h-9 flex-1 bg-transparent text-[14px] outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-px bg-[var(--color-border)] p-px" role="tablist" aria-label="Filter patients">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-8 px-2.5 text-[13px] ${
                filter === f.id
                  ? "bg-[var(--color-foreground)] font-medium text-white"
                  : "bg-[var(--color-background)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
              }`}
            >
              {f.label} <span className="num text-[11px] opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead>
            <tr>
              {sortHeader("name", "Patient")}
              <th className={`${th} hidden lg:table-cell`}>Phone</th>
              <th className={th}>Age / G·P</th>
              {sortHeader("ga", "GA")}
              {sortHeader("edd", "EDD")}
              {sortHeader("next", "Next visit", "hidden md:table-cell")}
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.id}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a")) return;
                  router.push(`/patients/${r.id}`);
                }}
                className="cursor-pointer hover:bg-[var(--color-surface-1)]"
              >
                <td className={td}>
                  <Link href={`/patients/${r.id}`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  {r.clinicNo && <span className="num ml-2 text-[12px] text-[var(--color-charcoal)]">#{r.clinicNo}</span>}
                </td>
                <td className={`${td} num hidden text-[var(--color-charcoal)] lg:table-cell`}>{r.phone ?? "—"}</td>
                <td className={`${td} num`}>
                  {r.age ?? "—"} <span className="text-[var(--color-charcoal)]">/ {r.gp}</span>
                </td>
                <td className={`${td} num whitespace-nowrap`}>
                  {r.gaLabel}
                  {r.trimester && <span className="ml-1.5 text-[12px] text-[var(--color-charcoal)]">T{r.trimester}</span>}
                </td>
                <td className={`${td} num whitespace-nowrap`}>
                  {r.eddLabel}
                  {r.eddInDays !== null && r.eddInDays <= 30 && (
                    <span className={`ml-1.5 text-[12px] ${r.eddInDays < 0 ? "text-[var(--color-overdue)]" : "text-[var(--color-on-track)]"}`}>
                      {r.eddInDays < 0 ? `+${-r.eddInDays}d` : `${r.eddInDays}d`}
                    </span>
                  )}
                </td>
                <td className={`${td} num hidden whitespace-nowrap md:table-cell`}>{r.nextVisitLabel}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1">
                    <Tag tone={RISK[r.risk].tone}>{RISK[r.risk].label}</Tag>
                    {r.overdueCount > 0 && <Tag tone="warning">{r.overdueCount} overdue</Tag>}
                    {r.flags
                      .filter((f) => f.severity !== "info")
                      .slice(0, 2)
                      .map((f) => (
                        <Tag key={f.code} tone={SEVERITY_TONE[f.severity]}>
                          {f.label}
                        </Tag>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-[var(--color-charcoal)]">
            {rows.length === 0 ? "No active patients yet." : "No patients match this search or filter."}
          </p>
        )}
      </div>
      <p className="num border-t border-[var(--color-border)] px-3 py-2 text-[12px] text-[var(--color-charcoal)]">
        Showing {visible.length} of {rows.length}
      </p>
    </div>
  );
}
