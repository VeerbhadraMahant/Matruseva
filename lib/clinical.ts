/**
 * Rule-based clinical flags shown alongside the follow-up worklist. These
 * are assistive prompts, not diagnoses. Cut-offs follow common WHO / ACOG
 * antenatal thresholds and still need the Clinical Lead's sign-off.
 */

export type FlagSeverity = "critical" | "warning" | "info";

export interface ClinicalFlag {
  code: string;
  label: string;
  severity: FlagSeverity;
}

export interface VitalsInput {
  bpSys: number | null;
  bpDia: number | null;
  hb: number | null;
  fhr: number | null;
}

export interface PatientFactsInput {
  age: number | null;
  gravida: number | null;
  rhNegative: boolean;
  bloodGroup?: string | null;
  gaWeeks: number | null;
}

export function bpFlag(sys: number | null, dia: number | null): ClinicalFlag | null {
  if (sys === null && dia === null) return null;
  if ((sys ?? 0) >= 160 || (dia ?? 0) >= 110) return { code: "bp_severe", label: "Severe hypertension", severity: "critical" };
  if ((sys ?? 0) >= 140 || (dia ?? 0) >= 90) return { code: "bp_high", label: "Hypertension", severity: "warning" };
  return null;
}

export function hbFlag(hb: number | null): ClinicalFlag | null {
  if (hb === null) return null;
  if (hb < 7) return { code: "hb_severe", label: "Severe anaemia", severity: "critical" };
  if (hb < 10) return { code: "hb_moderate", label: "Moderate anaemia", severity: "warning" };
  if (hb < 11) return { code: "hb_mild", label: "Mild anaemia", severity: "info" };
  return null;
}

export function fhrFlag(fhr: number | null): ClinicalFlag | null {
  if (fhr === null) return null;
  if (fhr < 110 || fhr > 160) return { code: "fhr_abnormal", label: "FHR outside 110–160", severity: "warning" };
  return null;
}

export function vitalsFlags(v: VitalsInput): ClinicalFlag[] {
  return [bpFlag(v.bpSys, v.bpDia), hbFlag(v.hb), fhrFlag(v.fhr)].filter((f): f is ClinicalFlag => f !== null);
}

export function patientFlags(p: PatientFactsInput): ClinicalFlag[] {
  const flags: ClinicalFlag[] = [];
  if (p.gaWeeks !== null && p.gaWeeks >= 42) flags.push({ code: "post_term", label: "Post-term (≥42w)", severity: "critical" });
  else if (p.gaWeeks !== null && p.gaWeeks >= 41) flags.push({ code: "post_dates", label: "Post-dates (≥41w)", severity: "warning" });
  // The Rh checkbox and the blood-group field are entered separately and can disagree; flag if either says negative.
  if (p.rhNegative || p.bloodGroup?.trim().endsWith("-")) flags.push({ code: "rh_neg", label: "Rh negative", severity: "info" });
  if (p.age !== null && p.age >= 35) flags.push({ code: "age_35", label: "Age ≥35", severity: "info" });
  if (p.age !== null && p.age < 18) flags.push({ code: "age_teen", label: "Adolescent", severity: "info" });
  if (p.gravida !== null && p.gravida >= 5) flags.push({ code: "grand_multi", label: "Grand multigravida", severity: "info" });
  return flags;
}

const SEVERITY_RANK: Record<FlagSeverity, number> = { critical: 0, warning: 1, info: 2 };

export function sortFlags(flags: ClinicalFlag[]): ClinicalFlag[] {
  return [...flags].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
