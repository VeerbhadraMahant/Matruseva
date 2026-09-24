/**
 * String-literal unions that the DB enforces via CHECK constraints or view
 * CASE expressions but that `supabase gen types` can't infer (it types
 * those columns as plain `string`). Keep in sync with
 * supabase/migrations/*.sql by hand.
 */

export type CareEventKind = "scan" | "test" | "injection" | "visit";
export type PatientStatus = "active" | "delivered" | "transferred" | "loss" | "closed";
export type DocType = "report" | "scan" | "prescription" | "case_paper" | "register_page" | "other";
export type DocSource = "whatsapp" | "pdf" | "paper" | "camera";
export type ContactChannel = "call" | "whatsapp";
export type ContactOutcome = "reached" | "no_answer" | "wrong_number" | "will_visit" | "refused";
export type StaffRole = "doctor" | "staff";
export type CareEventStatus = "done" | "skipped" | "upcoming" | "due" | "overdue";
export type FollowUpRisk = "on_track" | "at_risk" | "lost";
