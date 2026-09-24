/**
 * Mirrors the SQL logic in the `patient_followup_risk` view
 * (supabase/migrations/20260924231336_matrusetu_schema.sql). The database
 * view is the source of truth for what the app displays; this pure
 * function exists so the same rules can be unit tested and previewed
 * client-side without a round trip.
 */

export type RiskLevel = "on_track" | "at_risk" | "lost";

export interface RiskInput {
  patientStatus: string;
  nextVisitDate: Date | null;
  hasOverdueCriticalEvent: boolean;
  /** count of no_answer/wrong_number outcomes among the last 2 contact_log rows */
  recentContactNoAnswerStreak: number;
  today: Date;
  riskAtRiskDays: number;
  riskLostDays: number;
}

function daysLate(dueDate: Date, today: Date): number {
  const dueUTC = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((todayUTC - dueUTC) / (24 * 60 * 60 * 1000));
}

export function computeFollowUpRisk(input: RiskInput): RiskLevel {
  if (input.patientStatus !== "active") return "on_track";

  const overdueVisitDays = input.nextVisitDate ? daysLate(input.nextVisitDate, input.today) : null;

  if (overdueVisitDays !== null && overdueVisitDays > input.riskLostDays) return "lost";
  if (input.hasOverdueCriticalEvent) return "at_risk";
  if (overdueVisitDays !== null && overdueVisitDays > input.riskAtRiskDays) return "at_risk";
  if (input.recentContactNoAnswerStreak >= 2) return "at_risk";

  return "on_track";
}
