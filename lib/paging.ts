/** Incremental-rendering helpers for long lists. */
export const PAGE_SIZE = 50;

/** Next render limit after pressing "Show more", clamped to the total. */
export function nextLimit(current: number, total: number, pageSize: number = PAGE_SIZE): number {
  return Math.min(Math.max(current, 0) + pageSize, Math.max(total, 0));
}

/** How many items are not rendered yet. */
export function remainingCount(total: number, limit: number): number {
  return Math.max(total - limit, 0);
}
