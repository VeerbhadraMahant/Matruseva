import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { intlLocale } from "@/lib/i18n/intl";

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

/** Format a calendar date with Intl in the given UI locale (Latin digits always). */
export function formatDateWith(
  isoDate: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (!isoDate) return "—";
  return parseLocalDate(isoDate).toLocaleDateString(intlLocale(locale), options);
}

export function formatDate(isoDate: string | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  return formatDateWith(isoDate, { day: "2-digit", month: "short", year: "numeric" }, locale);
}

export function formatShortDate(isoDate: string | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  return formatDateWith(isoDate, { day: "2-digit", month: "short" }, locale);
}

/** Locale-aware number (Latin digits, Indian grouping). */
export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}

/**
 * "today", "in 3d", "5d ago" relative to `today`. English output is the
 * legacy compact form; hi/mr use Intl.RelativeTimeFormat (numeric: "auto").
 */
export function relativeDays(isoDate: string, today: Date, locale: Locale = DEFAULT_LOCALE): string {
  const d = daysBetween(today, parseLocalDate(isoDate));
  if (locale !== "en") {
    return new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" }).format(d, "day");
  }
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return d > 0 ? `in ${d}d` : `${-d}d ago`;
}

export function formatGravidaPara(gravida: number | null, para: number | null): string {
  if (gravida === null && para === null) return "—";
  return `G${gravida ?? "?"}P${para ?? "?"}`;
}
