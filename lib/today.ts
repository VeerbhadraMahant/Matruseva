const CLINIC_TIMEZONE = "Asia/Kolkata";

/**
 * "Today" as a local Date whose year/month/day match the clinic's timezone
 * (Asia/Kolkata), regardless of what timezone the server process itself
 * runs in (UTC on most hosting, IST on a dev machine, etc). Pairs with
 * lib/pregnancy.ts and lib/schedule.ts, which read a Date's *local*
 * calendar fields as the canonical date.
 */
export function todayInClinicTimezone(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return new Date(get("year"), get("month") - 1, get("day"));
}

/** YYYY-MM-DD for a date-only Postgres column, from a local-calendar Date (see above). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
