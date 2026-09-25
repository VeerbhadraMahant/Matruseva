const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" → local-calendar Date (see lib/today.ts for the convention). */
export function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  return parseLocalDate(isoDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatShortDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  return parseLocalDate(isoDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/** "today", "in 3d", "5d ago" relative to `today`. */
export function relativeDays(isoDate: string, today: Date): string {
  const d = daysBetween(today, parseLocalDate(isoDate));
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return d > 0 ? `in ${d}d` : `${-d}d ago`;
}

export function formatGravidaPara(gravida: number | null, para: number | null): string {
  if (gravida === null && para === null) return "—";
  return `G${gravida ?? "?"}P${para ?? "?"}`;
}
