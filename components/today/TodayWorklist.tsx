"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowRight, CaretDown, CheckCircle, Phone, Warning } from "@phosphor-icons/react";
import { Badge, STATUS_BADGE } from "./StatusBadge";
import type { DayEntry, WorklistDay, WorklistRow } from "./types";

type Filter = "all" | "atRisk" | "overdue" | "scheduled";

const PAGE_SIZE = 8;

function matches(filter: Filter, entry: DayEntry, row: WorklistRow): boolean {
  switch (filter) {
    case "all":
      return true;
    case "atRisk":
      return row.isAtRisk;
    case "overdue":
      return row.isOverdue;
    case "scheduled":
      return entry.scheduled;
  }
}

function WeekStrip({
  days,
  selected,
  onSelect,
}: {
  days: WorklistDay[];
  selected: string;
  onSelect: (iso: string) => void;
}) {
  return (
    <div role="group" aria-label="Choose a day" className="pc-glass grid grid-cols-7 gap-1 rounded-[24px] p-1.5 sm:gap-2 sm:p-2">
      {days.map((d) => {
        const active = d.iso === selected;
        const count = d.entries.length;
        return (
          <button
            key={d.iso}
            type="button"
            aria-pressed={active}
            aria-label={`${d.isToday ? "Today, " : ""}${d.weekday} ${d.dayOfMonth} ${d.monthLabel}: ${count} ${count === 1 ? "patient" : "patients"}`}
            onClick={() => onSelect(d.iso)}
            className={`relative mx-auto flex min-h-[84px] w-full max-w-16 flex-col items-center justify-center gap-1 rounded-full px-1 py-2 transition-[background-color,color,box-shadow,transform] duration-200 ${
              active
                ? "bg-pc-plum text-white shadow-[0_10px_24px_-10px_rgb(62_42_92/0.7)]"
                : "text-pc-muted hover:bg-pc-card/80 motion-safe:hover:-translate-y-0.5"
            }`}
          >
            <span className="text-[12px] font-medium">{d.isToday ? "Today" : d.weekday}</span>
            <span className={`text-[19px] font-semibold leading-none tabular-nums ${active ? "" : "text-pc-ink"}`}>
              {d.dayOfMonth}
            </span>
            <span
              aria-hidden
              className={`min-w-6 rounded-full px-1.5 text-center text-[11px] font-semibold leading-[18px] tabular-nums ${
                count === 0
                  ? "invisible"
                  : active
                    ? "bg-white text-pc-plum"
                    : "bg-pc-lilac text-pc-plum"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Detail({ label, value, sub }: { label: string; value: string; sub: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-pc-muted">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-medium tabular-nums">{value}</dd>
      {sub && <dd className="text-[12px] text-pc-muted">{sub}</dd>}
    </div>
  );
}

function Row({
  row,
  reason,
  expanded,
  onToggle,
  index,
}: {
  row: WorklistRow;
  reason: string;
  expanded: boolean;
  onToggle: () => void;
  index: number;
}) {
  const panelId = useId();
  const badge = STATUS_BADGE[row.status];
  const hasCritical = row.alerts.some((a) => a.critical);

  return (
    <li
      className={`pc-rise border-b border-pc-line/70 last:border-0 transition-colors duration-200 ${expanded ? "bg-pc-lilac/45" : ""}`}
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-pc-lilac/30 sm:px-5"
      >
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pc-lilac text-[13px] font-semibold text-pc-plum"
        >
          {row.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">{row.name}</span>
            {hasCritical && (
              <Warning size={15} weight="fill" className="shrink-0 text-pc-overdue" aria-label="Clinical alert" />
            )}
          </span>
          <span className="block truncate text-[13px] text-pc-muted">
            <span className="tabular-nums">{row.meta}</span>
            <span aria-hidden> · </span>
            {reason}
          </span>
        </span>
        <Badge tone={badge.tone}>{badge.label}</Badge>
        <CaretDown
          size={16}
          aria-hidden
          className={`shrink-0 text-pc-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id={panelId}
        inert={!expanded}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 px-4 pb-5 pt-1 sm:px-5 sm:pl-[72px]">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Detail label="Last visit" value={row.lastVisit} sub={row.lastVisitRelative} />
              <Detail label="Next ANC due" value={row.nextAnc} sub={row.nextAncDetail} />
              {row.edd && <Detail label="EDD" value={row.edd} sub={row.eddRelative} />}
            </dl>

            {(row.alerts.length > 0 || row.openItems.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {row.alerts.map((a) => (
                  <Badge key={a.label} tone={a.critical ? "overdue" : "risk"}>
                    {a.label}
                  </Badge>
                ))}
                {row.openItems.map((item) => (
                  <Badge key={`${item.name}-${item.closes}`} tone={item.status === "overdue" ? "overdue" : "plum"}>
                    {item.name} · {item.status === "overdue" ? "was due" : "by"} {item.closes}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {row.telHref && (
                <a
                  href={row.telHref}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-pc-plum px-4 text-[14px] font-semibold text-white transition-colors hover:bg-pc-plum-hover"
                >
                  <Phone size={16} aria-hidden /> Call {row.phone}
                </a>
              )}
              <Link
                href={`/patients/${row.id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-pc-line bg-pc-card px-4 text-[14px] font-medium transition-colors hover:border-pc-plum"
              >
                Open record <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export function TodayWorklist({ days, rows }: { days: WorklistDay[]; rows: WorklistRow[] }) {
  const [selected, setSelected] = useState(days[0]?.iso ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const day = days.find((d) => d.iso === selected) ?? days[0];

  const pairs = useMemo(
    () =>
      (day?.entries ?? []).flatMap((entry) => {
        const row = rowById.get(entry.rowId);
        return row ? [{ entry, row }] : [];
      }),
    [day, rowById],
  );

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "atRisk", label: "At risk" },
    { id: "overdue", label: "Overdue" },
    { id: "scheduled", label: day?.isToday ? "Due today" : `Due ${day?.weekday ?? ""}` },
  ];

  const visible = pairs.filter(({ entry, row }) => matches(filter, entry, row));
  const shown = showAll ? visible : visible.slice(0, PAGE_SIZE);

  const selectDay = (iso: string) => {
    setSelected(iso);
    setExpanded(null);
    setShowAll(false);
  };
  const selectFilter = (f: Filter) => {
    setFilter(f);
    setExpanded(null);
    setShowAll(false);
  };

  const dayTitle = day
    ? day.isToday
      ? "Today"
      : `${day.weekday} ${day.dayOfMonth} ${day.monthLabel}`
    : "";

  return (
    <section aria-labelledby="worklist-title" className="space-y-4">
      <WeekStrip days={days} selected={selected} onSelect={selectDay} />

      <div className="pc-glass overflow-hidden rounded-[24px]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
          <h2 id="worklist-title" className="text-[17px] font-semibold">
            Worklist <span className="font-normal text-pc-muted">· {dayTitle}</span>
          </h2>
          <Link
            href="/calls"
            className="inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-pc-plum hover:underline"
          >
            Open call queue <ArrowRight size={13} aria-hidden />
          </Link>
        </div>

        <div role="group" aria-label="Filter worklist" className="flex gap-2 overflow-x-auto px-4 pb-4 sm:px-5">
          {chips.map((c) => {
            const count = pairs.filter(({ entry, row }) => matches(c.id, entry, row)).length;
            const active = filter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => selectFilter(c.id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition-colors duration-200 ${
                  active
                    ? "border-pc-plum bg-pc-plum text-white"
                    : "border-pc-line bg-pc-card/80 text-pc-ink hover:border-pc-plum"
                }`}
              >
                {c.label}
                <span
                  className={`rounded-full px-1.5 text-[12px] font-semibold leading-5 tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-pc-lilac text-pc-plum"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div aria-live="polite" className="sr-only">
          {visible.length} {visible.length === 1 ? "patient" : "patients"} shown
        </div>

        {visible.length === 0 ? (
          <div key={`${selected}-${filter}-empty`} className="pc-rise flex flex-col items-center gap-2 border-t border-pc-line/70 px-6 py-12 text-center">
            <CheckCircle size={32} weight="duotone" className="text-pc-active" aria-hidden />
            <p className="text-[15px] font-medium">Nothing here</p>
            <p className="max-w-xs text-[13px] text-pc-muted">
              {filter === "all"
                ? `No patients need action ${day?.isToday ? "today" : `on ${dayTitle}`}.`
                : "No patients match this filter for the selected day."}
            </p>
          </div>
        ) : (
          <ul key={`${selected}-${filter}`} className="border-t border-pc-line/70">
            {shown.map(({ entry, row }, i) => (
              <Row
                key={row.id}
                row={row}
                reason={entry.reason ?? row.summary}
                index={i}
                expanded={expanded === row.id}
                onToggle={() => setExpanded((cur) => (cur === row.id ? null : row.id))}
              />
            ))}
          </ul>
        )}

        {visible.length > PAGE_SIZE && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="flex min-h-12 w-full items-center justify-center border-t border-pc-line/70 text-[14px] font-semibold text-pc-plum transition-colors hover:bg-pc-lilac/40"
          >
            {showAll ? "Show fewer" : `Show ${visible.length - PAGE_SIZE} more`}
          </button>
        )}
      </div>
    </section>
  );
}
