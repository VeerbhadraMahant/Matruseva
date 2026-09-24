/**
 * Pregnancy dating math. All dates are plain calendar dates (no time zone),
 * matching Postgres `date` columns. "Today" is passed in explicitly so
 * callers control the clock (tests, Asia/Kolkata "today" from the app).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const FULL_TERM_DAYS = 280; // 40 weeks, Naegele's rule

function toUTCDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((toUTCDate(to).getTime() - toUTCDate(from).getTime()) / DAY_MS);
}

export function addDays(date: Date, days: number): Date {
  const d = toUTCDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Naegele's rule: EDD = LMP + 280 days. */
export function eddFromLmp(lmp: Date): Date {
  return addDays(lmp, FULL_TERM_DAYS);
}

export interface GestationalAge {
  days: number;
  weeks: number;
  daysRemainder: number;
}

/** Gestational age in completed weeks + days, as of `today`. */
export function gestationalAge(lmp: Date, today: Date): GestationalAge {
  const days = Math.max(0, daysBetween(lmp, today));
  return { days, weeks: Math.floor(days / 7), daysRemainder: days % 7 };
}

/** Gestational age expressed as a fractional week number (e.g. 12.43 = 12w3d), for schedule windows. */
export function gestationalAgeWeeksDecimal(lmp: Date, today: Date): number {
  const { days } = gestationalAge(lmp, today);
  return days / 7;
}

export function formatGA(ga: GestationalAge): string {
  return `${ga.weeks}w${ga.daysRemainder}d`;
}

export type Trimester = 1 | 2 | 3;

export function trimester(ga: GestationalAge): Trimester {
  if (ga.weeks < 13) return 1;
  if (ga.weeks < 27) return 2;
  return 3;
}

/** Convert a fractional-week schedule offset (e.g. 13.85 = 13w6d) into a calendar date from LMP. */
export function dateAtWeek(lmp: Date, weeks: number): Date {
  return addDays(lmp, Math.round(weeks * 7));
}
