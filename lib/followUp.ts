import type { FollowUpRisk } from "@/lib/supabase/enums";

export function isAtRisk(risk: FollowUpRisk): boolean {
  return risk === "at_risk";
}

export function isLost(risk: FollowUpRisk): boolean {
  return risk === "lost";
}

export function hasOverdueItems(count: number): boolean {
  return count > 0;
}

export function needsFollowUp(patient: { risk: FollowUpRisk; overdue: readonly unknown[] }): boolean {
  return isAtRisk(patient.risk) || isLost(patient.risk) || hasOverdueItems(patient.overdue.length);
}

export function isManualContact(outcome: string): boolean {
  return outcome !== "automated_reminder";
}
