import type { MessageKey } from "@/lib/i18n/messages";
import type { Tone } from "@/components/ui";
import type { RowStatus } from "./types";

/** `label` is a message key: translate with t(label) in the consuming component. */
export const STATUS_BADGE: Record<RowStatus, { tone: Tone; label: MessageKey }> = {
  overdue: { tone: "critical", label: "today.status.overdue" },
  lost: { tone: "critical", label: "today.status.lost" },
  atRisk: { tone: "warning", label: "today.status.atRisk" },
  due: { tone: "info", label: "today.status.due" },
  onTrack: { tone: "ok", label: "today.status.onTrack" },
};
