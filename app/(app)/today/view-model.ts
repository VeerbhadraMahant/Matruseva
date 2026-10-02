import { daysOverdue, followUpPriority, needsFollowUp, type PatientRow } from "@/lib/snapshot";
import { formatGA, trimester } from "@/lib/pregnancy";
import { daysBetween, formatDate, formatShortDate, parseLocalDate, relativeDays } from "@/lib/format";
import { toISODate } from "@/lib/today";
import { telLink } from "@/lib/whatsapp";
import type { DayEntry, RowStatus, WorklistDay, WorklistRow } from "@/components/today/types";

const WEEK_LENGTH = 7;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function shortItemName(name: string): string {
  return name.split("(")[0].trim();
}

function rowStatus(row: PatientRow): RowStatus {
  if (row.risk === "lost") return "lost";
  if (row.overdue.length > 0) return "overdue";
  if (row.risk === "at_risk") return "atRisk";
  if (row.due.length > 0) return "due";
  return "onTrack";
}

function rowSummary(row: PatientRow, today: Date): string {
  if (row.overdue.length > 0) {
    const first = shortItemName(row.overdue[0].name);
    const more = row.overdue.length > 1 ? ` +${row.overdue.length - 1} more` : "";
    return `${first} overdue ${daysOverdue(row, today)}d${more}`;
  }
  if (row.risk === "lost") return "No contact for an extended period";
  if (row.risk === "at_risk") return row.noAnswerStreak >= 2 ? `Unreachable · ${row.noAnswerStreak} missed calls` : "Missed booked visit";
  const critical = row.flags.find((f) => f.severity === "critical");
  if (critical) return critical.label;
  if (row.nextVisitDate === toISODate(today)) return "Visit booked today";
  if (row.due.length > 0) return `${shortItemName(row.due[0].name)} due`;
  return "On schedule";
}

function toRow(row: PatientRow, today: Date): WorklistRow {
  const upcoming = [...row.due].sort((a, b) => a.dueTo.localeCompare(b.dueTo))[0];
  const nextAncIso = row.nextVisitDate ?? upcoming?.dueTo ?? null;
  const telHref = row.phone ? telLink(row.phone) : null;

  return {
    id: row.id,
    name: row.name,
    initials: initials(row.name),
    meta: [row.ga ? `${formatGA(row.ga)} · T${trimester(row.ga)}` : "No LMP", row.age ? `${row.age}y` : null]
      .filter(Boolean)
      .join(" · "),
    phone: row.phone,
    telHref,
    status: rowStatus(row),
    summary: rowSummary(row, today),
    isAtRisk: row.risk !== "on_track",
    isOverdue: row.overdue.length > 0,
    alerts: row.flags
      .filter((f) => f.severity !== "info")
      .map((f) => ({ label: f.label, critical: f.severity === "critical" })),
    lastVisit: row.latestVisit ? formatDate(row.latestVisit.visitDate) : "No visits yet",
    lastVisitRelative: row.latestVisit ? relativeDays(row.latestVisit.visitDate, today) : null,
    nextAnc: nextAncIso ? formatDate(nextAncIso) : "Not scheduled",
    nextAncDetail: row.nextVisitDate
      ? `Booked visit · ${relativeDays(row.nextVisitDate, today)}`
      : upcoming
        ? `${shortItemName(upcoming.name)} · window closes ${relativeDays(upcoming.dueTo, today)}`
        : null,
    edd: row.edd ? formatDate(row.edd) : null,
    eddRelative: row.edd ? relativeDays(row.edd, today) : null,
    openItems: [
      ...row.overdue.map((e) => ({ name: shortItemName(e.name), status: "overdue" as const, closes: formatShortDate(e.dueTo) })),
      ...row.due.map((e) => ({ name: shortItemName(e.name), status: "due" as const, closes: formatShortDate(e.dueTo) })),
    ].slice(0, 5),
  };
}

/**
 * Builds the Today worklist: one bucket per day for the coming week.
 * Today = everyone needing follow-up, with a critical clinical flag, a visit
 * booked today, or a schedule window closing today. Later days = booked
 * visits and windows closing on that day.
 */
export function buildWorklist(rows: PatientRow[], today: Date) {
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
            ? "Visit booked"
            : closing
              ? `${shortItemName(closing.name)} · window closes`
              : null,
      });
    }

    return {
      iso,
      weekday: date.toLocaleDateString("en-IN", { weekday: "short" }),
      dayOfMonth: date.getDate(),
      monthLabel: date.toLocaleDateString("en-IN", { month: "short" }),
      isToday,
      entries,
    };
  });

  const used = new Set(days.flatMap((d) => d.entries.map((e) => e.rowId)));
  const worklistRows = sorted.filter((r) => used.has(r.id)).map((r) => toRow(r, today));

  return { days, rows: worklistRows, todayIso };
}

export function upcomingDeliveries(rows: PatientRow[], today: Date) {
  return rows
    .filter((r) => r.edd)
    .map((r) => ({ id: r.id, name: r.name, edd: r.edd!, inDays: daysBetween(today, parseLocalDate(r.edd!)) }))
    .filter((x) => x.inDays <= 30)
    .sort((a, b) => a.inDays - b.inDays)
    .map((x) => ({ ...x, eddLabel: formatShortDate(x.edd), relative: relativeDays(x.edd, today) }));
}
