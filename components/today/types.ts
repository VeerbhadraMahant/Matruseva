// Serializable view model passed from the Today server page to its client widgets.

export type RowStatus = "overdue" | "lost" | "atRisk" | "due" | "onTrack";

export interface WorklistAlert {
  label: string;
  critical: boolean;
}

export interface WorklistItem {
  name: string;
  status: "overdue" | "due";
  closes: string;
}

export interface WorklistRow {
  id: string;
  name: string;
  initials: string;
  meta: string;
  phone: string | null;
  telHref: string | null;
  status: RowStatus;
  summary: string;
  isAtRisk: boolean;
  isOverdue: boolean;
  alerts: WorklistAlert[];
  lastVisit: string;
  lastVisitRelative: string | null;
  nextAnc: string;
  nextAncDetail: string | null;
  edd: string | null;
  eddRelative: string | null;
  openItems: WorklistItem[];
}

export interface DayEntry {
  rowId: string;
  /** Booked visit or schedule window closing on this exact day. */
  scheduled: boolean;
  /** Day-specific reason, shown instead of the row summary on future days. */
  reason: string | null;
}

export interface WorklistDay {
  iso: string;
  weekday: string;
  dayOfMonth: number;
  monthLabel: string;
  isToday: boolean;
  entries: DayEntry[];
}
