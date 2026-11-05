import type { Translator } from "@/lib/i18n/translate-client";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Trimester } from "@/lib/pregnancy";

/**
 * Display helpers for clinical vocabulary shared across screens. All take the
 * translator from getT() (server) or useT() (client) and fall back to the raw
 * English text for values they do not know (e.g. custom schedule items).
 */

const EVENT_PATTERNS: [RegExp, MessageKey][] = [
  [/^booking/i, "clinical.event.booking"],
  [/^dating/i, "clinical.event.datingScan"],
  [/^nt scan/i, "clinical.event.ntScan"],
  [/^anomaly scan/i, "clinical.event.anomalyScan"],
  [/^td dose 1/i, "clinical.event.td1"],
  [/^td dose 2/i, "clinical.event.td2"],
  [/^tdap/i, "clinical.event.tdap"],
  [/^ogtt/i, "clinical.event.ogtt"],
  [/^repeat cbc/i, "clinical.event.repeatCbc"],
  [/^anti-d/i, "clinical.event.antiD"],
  [/^growth scan/i, "clinical.event.growthScan"],
  [/^weekly non-stress/i, "clinical.event.nst"],
];

/** Localized name of an ANC schedule item (matched on the English name; a trailing "(32w)" is kept). */
export function careEventName(name: string, t: Translator): string {
  const trimmed = name.trim();
  for (const [re, key] of EVENT_PATTERNS) {
    if (!re.test(trimmed)) continue;
    const weeks = trimmed.match(/\((\d+)\s*w\)\s*$/i);
    return weeks ? `${t(key)} (${t("clinical.ga.weeksShort", { weeks: Number(weeks[1]) })})` : t(key);
  }
  return name;
}

const KIND_KEYS: Record<string, MessageKey> = {
  scan: "clinical.kind.scan",
  test: "clinical.kind.test",
  injection: "clinical.kind.injection",
  visit: "clinical.kind.visit",
};
export function careEventKind(kind: string, t: Translator): string {
  const key = KIND_KEYS[kind];
  return key ? t(key) : kind;
}

const STATUS_KEYS: Record<string, MessageKey> = {
  done: "clinical.status.done",
  skipped: "clinical.status.skipped",
  upcoming: "clinical.status.upcoming",
  due: "clinical.status.due",
  overdue: "clinical.status.overdue",
};
/** Care-event status badge text ("due" reads "Due now"). */
export function careStatusLabel(status: string, t: Translator): string {
  const key = STATUS_KEYS[status];
  return key ? t(key) : status;
}

const RISK_KEYS: Record<string, MessageKey> = {
  on_track: "clinical.risk.on_track",
  at_risk: "clinical.risk.at_risk",
  lost: "clinical.risk.lost",
};
export function followUpRiskLabel(risk: string, t: Translator): string {
  const key = RISK_KEYS[risk];
  return key ? t(key) : risk;
}

const OUTCOME_KEYS: Record<string, MessageKey> = {
  reached: "clinical.outcome.reached",
  will_visit: "clinical.outcome.will_visit",
  no_answer: "clinical.outcome.no_answer",
  wrong_number: "clinical.outcome.wrong_number",
  refused: "clinical.outcome.refused",
};
export function contactOutcomeLabel(outcome: string, t: Translator): string {
  const key = OUTCOME_KEYS[outcome];
  return key ? t(key) : outcome;
}

const DOC_KEYS: Record<string, MessageKey> = {
  report: "clinical.docType.report",
  scan: "clinical.docType.scan",
  prescription: "clinical.docType.prescription",
  case_paper: "clinical.docType.case_paper",
  register_page: "clinical.docType.register_page",
  other: "clinical.docType.other",
};
export function documentTypeLabel(type: string, t: Translator): string {
  const key = DOC_KEYS[type];
  return key ? t(key) : type;
}

export function trimesterLabel(tri: Trimester, t: Translator): string {
  return t(`clinical.trimester.long${tri}` as MessageKey);
}
