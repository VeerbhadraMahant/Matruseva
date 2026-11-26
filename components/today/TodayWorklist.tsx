"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { ArrowRight, CaretDown, CheckCircle, Phone, Warning } from "@phosphor-icons/react";
import { useT } from "@/lib/i18n/provider";
import {
  Panel,
  StatusDot,
  Tag,
  TONE_DOT,
  buttonSecondary,
  chipClass,
  chipCountClass,
  iconButton,
  rowLink,
  type Tone,
} from "@/components/ui";
import { STATUS_BADGE } from "./StatusBadge";
import type { DayEntry, WorklistDay, WorklistItem, WorklistRow } from "./types";

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

/** Day picker: compact segmented row, 7 days. */
function WeekStrip({
  days,
  selected,
  onSelect,
}: {
  days: WorklistDay[];
  selected: string;
  onSelect: (iso: string) => void;
}) {
  const t = useT();
  return (
    <div role="group" aria-label={t("today.week.choose")} className="grid grid-cols-7 gap-1 border-t border-[var(--color-border)]/70 p-2">
      {days.map((d) => {
        const active = d.iso === selected;
        const count = d.entries.length;
        return (
          <button
            key={d.iso}
            type="button"
            aria-pressed={active}
            aria-label={t(d.isToday ? "today.week.ariaToday" : "today.week.aria", {
              weekday: d.weekday,
              day: d.dayOfMonth,
              month: d.monthLabel,
              count,
            })}
            onClick={() => onSelect(d.iso)}
            className={`press flex min-h-14 flex-col items-center justify-center rounded-[var(--radius-buttons)] px-1 py-1.5 text-[12px] transition-colors duration-150 ${
              active
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-charcoal)] hover:bg-[var(--color-surface-2)]"
            }`}
          >
            <span className="font-medium">{d.isToday ? t("today.week.today") : d.weekday}</span>
            <span className={`num text-[15px] font-semibold leading-5 ${active ? "" : "text-[var(--color-foreground)]"}`}>
              {d.dayOfMonth}
            </span>
            <span aria-hidden className={`num text-[11px] leading-4 ${count === 0 ? "invisible" : active ? "text-white/90" : ""}`}>
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
      <dt className="text-[12px] text-[var(--color-charcoal)]">{label}</dt>
      <dd className="num mt-0.5 text-[14px] font-medium">{value}</dd>
      {sub && <dd className="text-[12px] text-[var(--color-charcoal)]">{sub}</dd>}
    </div>
  );
}

function Row({
  row,
  reason,
  items,
  expanded,
  onToggle,
}: {
  row: WorklistRow;
  reason: string;
  items: WorklistItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const panelId = useId();
  const badge = STATUS_BADGE[row.status];
  const hasCritical = row.alerts.some((a) => a.critical);
  const late = row.status === "overdue" || row.status === "lost";

  return (
    <li className={expanded ? "bg-[var(--color-surface-1)]" : ""}>
      <div className="flex items-center">
        <Link href={`/patients/${row.id}`} className={`${rowLink} min-w-0 flex-1 items-start`}>
          <span className="pt-0.5">
            <StatusDot tone={badge.tone} label={t(badge.label)} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-semibold">{row.name}</span>
              {hasCritical && (
                <Warning size={15} weight="fill" className="shrink-0 text-[var(--color-overdue)]" aria-label={t("today.worklist.clinicalAlert")} />
              )}
            </span>
            <span
              className={`num mt-0.5 line-clamp-2 block text-[13px] ${late ? "font-medium text-[var(--color-overdue)]" : "text-[var(--color-foreground)]"}`}
            >
              {reason}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--color-charcoal)]">
              <span className="num">{row.meta}</span>
              {row.isAtRisk && <Tag tone={badge.tone}>{t(badge.label)}</Tag>}
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center pr-2">
          {row.telHref && (
            <a href={row.telHref} aria-label={t("today.worklist.call", { phone: row.phone ?? "" })} className={`${iconButton} text-[var(--color-primary)]`}>
              <Phone size={20} aria-hidden />
            </a>
          )}
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={t("today.worklist.details", { name: row.name })}
            onClick={onToggle}
            className={iconButton}
          >
            <CaretDown
              size={18}
              aria-hidden
              className={`transition-transform duration-200 ease-[var(--ease-out)] ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      <div
        id={panelId}
        inert={!expanded}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)] ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 px-4 pb-4 pt-1 sm:pl-11">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Detail label={t("today.worklist.lastVisit")} value={row.lastVisit} sub={row.lastVisitRelative} />
              <Detail label={t("today.worklist.nextAnc")} value={row.nextAnc} sub={row.nextAncDetail} />
              {row.edd && <Detail label={t("today.worklist.edd")} value={row.edd} sub={row.eddRelative} />}
            </dl>

            {(row.alerts.length > 0 || items.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {row.alerts.map((a) => (
                  <Tag key={a.label} tone={a.critical ? "critical" : "warning"}>
                    {a.label}
                  </Tag>
                ))}
                {items.map((item) => (
                  <Tag key={`${item.name}-${item.closes}`} tone={item.status === "overdue" ? "critical" : "info"}>
                    {t(item.status === "overdue" ? "today.worklist.itemWasDue" : "today.worklist.itemBy", {
                      name: item.name,
                      date: item.closes,
                    })}
                  </Tag>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {row.telHref && (
                <a href={row.telHref} className={buttonSecondary}>
                  <Phone size={16} aria-hidden /> <span className="num">{t("today.worklist.call", { phone: row.phone ?? "" })}</span>
                </a>
              )}
              <Link href={`/patients/${row.id}`} className={buttonSecondary}>
                {t("today.worklist.openRecord")} <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export function TodayWorklist({ days, rows, overdueCount = 0 }: { days: WorklistDay[]; rows: WorklistRow[]; overdueCount?: number }) {
  const t = useT();
  const [selected, setSelected] = useState(days[0]?.iso ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Severity order: overdue, due, high risk, then everyone.
  const chips: { id: Filter; label: string; tone: Tone | null }[] = [
    { id: "overdue", label: t("today.worklist.filter.overdue"), tone: "critical" },
    {
      id: "scheduled",
      label: day?.isToday
        ? t("today.worklist.filter.dueToday")
        : t("today.worklist.filter.dueDay", { weekday: day?.weekday ?? "" }),
      tone: "info",
    },
    { id: "atRisk", label: t("today.worklist.filter.atRisk"), tone: "warning" },
    { id: "all", label: t("today.worklist.filter.all"), tone: null },
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
    listRef.current?.scrollIntoView({ block: "nearest" });
  };

  const dayTitle = day
    ? day.isToday
      ? t("today.week.today")
      : t("today.worklist.dayTitle", { weekday: day.weekday, day: day.dayOfMonth, month: day.monthLabel })
    : "";

  return (
    <Panel
      title={`${t("today.worklist.title")} · ${dayTitle}`}
      action={
        <Link
          href={filter === "overdue" ? "/calls?f=overdue" : filter === "atRisk" ? "/calls?f=at_risk" : "/calls"}
          className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-[var(--color-primary)] hover:underline md:min-h-9"
        >
          {t("today.worklist.openCallQueue")} <ArrowRight size={13} aria-hidden />
        </Link>
      }
    >
      <div role="group" aria-label={t("today.worklist.filterLabel")} className="flex flex-wrap gap-2 px-4 py-3">
        {chips.map((c) => {
          const count = pairs.filter(({ entry, row }) => matches(c.id, entry, row)).length;
          const active = filter === c.id;
          return (
            <button key={c.id} type="button" aria-pressed={active} onClick={() => selectFilter(c.id)} className={chipClass(active)}>
              {c.tone && <span aria-hidden className={`h-2 w-2 rounded-full ${active ? "bg-white" : TONE_DOT[c.tone]}`} />}
              {c.label}
              <span className={chipCountClass(active)}>{count}</span>
            </button>
          );
        })}
      </div>

      {!day?.isToday && overdueCount > 0 && (
        <button
          type="button"
          onClick={() => selectDay(days[0]?.iso ?? "")}
          className="block w-full border-t border-[var(--color-border)]/70 px-4 py-2 text-left text-[13px] font-medium text-[var(--color-overdue)] hover:underline"
        >
          {t("today.worklist.overdueElsewhere", { count: overdueCount })}
        </button>
      )}

      <div aria-live="polite" className="sr-only">
        {t("today.worklist.shown", { count: visible.length })}
      </div>

      <div ref={listRef} className="scroll-mt-16">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 border-t border-[var(--color-border)]/70 px-6 py-10 text-center">
            <CheckCircle size={28} weight="duotone" className="text-[var(--color-on-track)]" aria-hidden />
            <p className="text-[15px] font-medium">{t("today.worklist.emptyTitle")}</p>
            <p className="max-w-xs text-[13px] text-[var(--color-charcoal)]">
              {filter === "all"
                ? day?.isToday
                  ? t("today.worklist.emptyToday")
                  : t("today.worklist.emptyDay", { day: dayTitle })
                : t("today.worklist.emptyFilter")}
            </p>
          </div>
        ) : (
          <ul key={`${selected}-${filter}`} className="divide-y divide-[var(--color-border)]/70 border-t border-[var(--color-border)]/70">
            {shown.map(({ entry, row }) => (
              <Row
                key={row.id}
                row={row}
                reason={entry.reasons.join(" · ") || row.summary}
                items={day?.isToday ? row.openItems : entry.items}
                expanded={expanded === row.id}
                onToggle={() => setExpanded((cur) => (cur === row.id ? null : row.id))}
              />
            ))}
          </ul>
        )}
      </div>

      {visible.length > PAGE_SIZE && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex min-h-12 w-full items-center justify-center border-t border-[var(--color-border)]/70 text-[14px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-surface-1)]"
        >
          {showAll ? t("today.worklist.showFewer") : t("today.worklist.showMore", { count: visible.length - PAGE_SIZE })}
        </button>
      )}

      <WeekStrip days={days} selected={selected} onSelect={selectDay} />
    </Panel>
  );
}
