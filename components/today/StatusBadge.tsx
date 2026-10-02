import type { RowStatus } from "./types";

export type BadgeTone = "overdue" | "risk" | "active" | "delivered" | "plum";

const TONE: Record<BadgeTone, string> = {
  overdue: "bg-pc-overdue-soft text-pc-overdue",
  risk: "bg-pc-risk-soft text-pc-risk",
  active: "bg-pc-active-soft text-pc-active",
  delivered: "bg-pc-delivered-soft text-pc-delivered",
  plum: "bg-pc-lilac text-pc-plum",
};

const DOT: Record<BadgeTone, string> = {
  overdue: "bg-pc-overdue",
  risk: "bg-pc-risk",
  active: "bg-pc-active",
  delivered: "bg-pc-delivered",
  plum: "bg-pc-plum",
};

export const STATUS_BADGE: Record<RowStatus, { tone: BadgeTone; label: string }> = {
  overdue: { tone: "overdue", label: "Overdue" },
  lost: { tone: "overdue", label: "Lost to follow-up" },
  atRisk: { tone: "risk", label: "At risk" },
  due: { tone: "plum", label: "Due" },
  onTrack: { tone: "active", label: "On track" },
};

/** Colour is never the only signal: every badge carries a text label. */
export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-5 ${TONE[tone]}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}
