import type { MessageKey } from "@/lib/i18n/messages";
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

/** `label` is a message key: translate with t(label) in the consuming component. */
export const STATUS_BADGE: Record<RowStatus, { tone: BadgeTone; label: MessageKey }> = {
  overdue: { tone: "overdue", label: "today.status.overdue" },
  lost: { tone: "overdue", label: "today.status.lost" },
  atRisk: { tone: "risk", label: "today.status.atRisk" },
  due: { tone: "plum", label: "today.status.due" },
  onTrack: { tone: "active", label: "today.status.onTrack" },
};

/** Colour is never the only signal: every badge carries a text label. */
export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-5 ${TONE[tone]}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}
