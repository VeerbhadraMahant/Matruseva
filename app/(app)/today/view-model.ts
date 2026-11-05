import { daysOverdue, followUpPriority, needsFollowUp, type PatientRow } from "@/lib/snapshot";
import { trimester } from "@/lib/pregnancy";
import { daysBetween, formatDate, formatShortDate, parseLocalDate, relativeDays } from "@/lib/format";
import { toISODate } from "@/lib/today";
import { telLink } from "@/lib/whatsapp";
import type { Locale } from "@/lib/i18n/config";
import { intlLocale } from "@/lib/i18n/intl";
import type { Translator } from "@/lib/i18n/translate-client";
import { flagLabel } from "@/lib/clinical";
import { careEventName } from "@/lib/clinicalLabels";
import { formatGALocalized } from "@/lib/pregnancy";
import type { DayEntry, RowStatus, WorklistDay, WorklistRow } from "@/components/today/types";

const WEEK_LENGTH = 7;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function shortItemName(name: string, t: Translator): string {
  return careEventName(name.split("(")[0].trim(), t);
}

function rowStatus(row: PatientRow): RowStatus {
  if (row.risk === "lost") return "lost";
  if (row.overdue.length > 0) return "overdue";
  if (row.risk === "at_risk") return "atRisk";
  if (row.due.length > 0) return "due";
  return "onTrack";
}

function rowSummary(row: PatientRow, today: Date, t: Translator): string {
  if (row.overdue.length > 0) {
    const item = shortItemName(row.overdue[0].name, t);
    const days = daysOverdue(row, today);
    return row.overdue.length > 1
      ? t("today.row.overdueMore", { item, days, more: row.overdue.length - 1 })
      : t("today.row.overdue", { item, days });
  }
  if (row.risk === "lost") return t("today.row.lost");
  if (row.risk === "at_risk")
    return row.noAnswerStreak >= 2 ? t("today.row.unreachable", { count: row.noAnswerStreak }) : t("today.row.missedBooked");
  const critical = row.flags.find((f) => f.severity === "critical");
  if (critical) return flagLabel(critical, t);
  if (row.nextVisitDate === toISODate(today)) return t("today.row.bookedToday");
  if (row.due.length > 0) return t("today.row.dueItem", { item: shortItemName(row.due[0].name, t) });
  return t("today.row.onSchedule");
}

function toRow(row: PatientRow, today: Date, t: Translator, locale: Locale): WorklistRow {
  const upcoming = [...row.due].sort((a, b) => a.dueTo.localeCompare(b.dueTo))[0];
  const nextAncIso = row.nextVisitDate ?? upcoming?.dueTo ?? null;
  const telHref = row.phone ? telLink(row.phone) : null;

  return {
    id: row.id,
    name: row.name,
    initials: initials(row.name),
    meta: [
      row.ga
        ? t("today.row.gaTrimester", {
            ga: formatGALocalized(row.ga, t),
            trimester: trimester(row.ga),
          })
        : t("today.row.noLmp"),
      row.age ? t("today.row.age", { age: row.age }) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    phone: row.phone,
    telHref,
    status: rowStatus(row),
    summary: rowSummary(row, today, t),
    isAtRisk: row.risk !== "on_track",
    isOverdue: row.overdue.length > 0,
    alerts: row.flags
      .filter((f) => f.severity !== "info")
      .map((f) => ({ label: flagLabel(f, t), critical: f.severity === "critical" })),
    lastVisit: row.latestVisit ? formatDate(row.latestVisit.visitDate, locale) : t("today.row.noVisits"),
    lastVisitRelative: row.latestVisit ? relativeDays(row.latestVisit.visitDate, today, locale) : null,
    nextAnc: nextAncIso ? formatDate(nextAncIso, locale) : t("today.row.notScheduled"),
    nextAncDetail: row.nextVisitDate
      ? t("today.row.bookedVisit", { when: relativeDays(row.nextVisitDate, today, locale) })
      : upcoming
        ? t("today.row.windowCloses", { item: shortItemName(upcoming.name, t), when: relativeDays(upcoming.dueTo, today, locale) })
        : null,
    edd: row.edd ? formatDate(row.edd, locale) : null,
    eddRelative: row.edd ? relativeDays(row.edd, today, locale) : null,
    openItems: [
      ...row.overdue.map((e) => ({ name: shortItemName(e.name, t), status: "overdue" as const, closes: formatShortDate(e.dueTo, locale) })),
      ...row.due.map((e) => ({ name: shortItemName(e.name, t), status: "due" as const, closes: formatShortDate(e.dueTo, locale) })),
    ].slice(0, 5),
  };
}

/**
 * Builds the Today worklist: one bucket per day for the coming week.
 * Today = everyone needing follow-up, with a critical clinical flag, a visit
 * booked today, or a schedule window closing today. Later days = booked
 * visits and windows closing on that day.
 */
export function buildWorklist(rows: PatientRow[], today: Date, t: Translator, locale: Locale) {
  const sorted = [...rows].sort(
    (a, b) => followUpPriority(a, today) - followUpPriority(b, today) || a.name.localeCompare(b.name),
  );
  const todayIso = toISODate(today);

  const days: WorklistDay[] = Array.from({ length: WEEK_LENGTH }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const iso = toISODate(date);
    const isToday = i === 0;

    const entries: DayEntry[] = [];
    for (const row of sorted) {
      const booked = row.nextVisitDate === iso;
      const closing = row.due.find((e) => e.dueTo === iso);
      const scheduled = booked || Boolean(closing);
      const attention = isToday && (needsFollowUp(row) || row.flags.some((f) => f.severity === "critical"));
      if (!scheduled && !attention) continue;
      entries.push({
        rowId: row.id,
        scheduled,
        reason: isToday
          ? null
          : booked
            ? t("today.row.visitBooked")
            : closing
              ? t("today.row.windowClosesShort", { item: shortItemName(closing.name, t) })
              : null,
      });
    }

    return {
      iso,
      weekday: date.toLocaleDateString(intlLocale(locale), { weekday: "short" }),
      dayOfMonth: date.getDate(),
      monthLabel: date.toLocaleDateString(intlLocale(locale), { month: "short" }),
      isToday,
      entries,
    };
  });

  const used = new Set(days.flatMap((d) => d.entries.map((e) => e.rowId)));
  const worklistRows = sorted.filter((r) => used.has(r.id)).map((r) => toRow(r, today, t, locale));

  return { days, rows: worklistRows, todayIso };
}

export function upcomingDeliveries(rows: PatientRow[], today: Date, locale: Locale) {
  return rows
    .filter((r) => r.edd)
    .map((r) => ({ id: r.id, name: r.name, edd: r.edd!, inDays: daysBetween(today, parseLocalDate(r.edd!)) }))
    .filter((x) => x.inDays >= -7 && x.inDays <= 30)
    .sort((a, b) => a.inDays - b.inDays)
    .map((x) => ({ ...x, eddLabel: formatShortDate(x.edd, locale), relative: relativeDays(x.edd, today, locale) }));
}
