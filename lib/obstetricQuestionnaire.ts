/**
 * Patient Obstetric Questionnaire Schema & Helper Utilities
 * Standardized for Indian Antenatal Care (FOGSI / PMSMA protocols).
 */

import { z } from "zod";
import type { PastObstetricHistory, FamilyPregnancyHistory } from "./obstetricReportData";

export interface ObstetricQuestionnaireData {
  previousDeliveryMode: "Primi" | "NVD" | "LSCS" | "Instrumental";
  priorComplications: string[]; // ["preeclampsia", "gdm", "pph", "preterm", "none"]
  pastPregnancyLoss: "0" | "1" | "2+" | "stillbirth";
  pastBirthWeight: "normal" | "low" | "high" | "na";
  interpregnancyInterval: "<18m" | "18m-5y" | ">5y" | "na";
  familyComplications: string[]; // ["preeclampsia", "diabetes", "twins", "anemia", "none"]
  chronicConditions: string[]; // ["hypertension", "thyroid", "cardiac", "asthma_epilepsy", "none"]
  doctorNotes?: string;
}

export const DEFAULT_OBSTETRIC_QUESTIONNAIRE: ObstetricQuestionnaireData = {
  previousDeliveryMode: "Primi",
  priorComplications: ["none"],
  pastPregnancyLoss: "0",
  pastBirthWeight: "na",
  interpregnancyInterval: "na",
  familyComplications: ["none"],
  chronicConditions: ["none"],
  doctorNotes: "",
};

export const obstetricQuestionnaireSchema = z.object({
  previousDeliveryMode: z.enum(["Primi", "NVD", "LSCS", "Instrumental"]).default("Primi"),
  priorComplications: z.array(z.string()).default([]),
  pastPregnancyLoss: z.enum(["0", "1", "2+", "stillbirth"]).default("0"),
  pastBirthWeight: z.enum(["normal", "low", "high", "na"]).default("na"),
  interpregnancyInterval: z.enum(["<18m", "18m-5y", ">5y", "na"]).default("na"),
  familyComplications: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  doctorNotes: z.string().optional().default(""),
});

/**
 * Converts questionnaire responses into structured PastObstetricHistory & FamilyPregnancyHistory
 * for the 1-Page Obstetric Dossier.
 */
export function questionnaireToObstetricReport(
  q: ObstetricQuestionnaireData,
  gravida: number = 1,
  para: number = 0
): { pastHistory: PastObstetricHistory; familyHistory: FamilyPregnancyHistory; derivedRiskFlags: string[] } {
  const isPrimi = q.previousDeliveryMode === "Primi" || (gravida <= 1 && para === 0);

  const deliveryModeMap: Record<string, "NVD" | "LSCS" | "Assisted (Forceps/Vacuum)" | "None (Primi)"> = {
    Primi: "None (Primi)",
    NVD: "NVD",
    LSCS: "LSCS",
    Instrumental: "Assisted (Forceps/Vacuum)",
  };

  const hasPreeclampsia = q.priorComplications.includes("preeclampsia");
  const hasGDM = q.priorComplications.includes("gdm");
  const hasPPH = q.priorComplications.includes("pph");
  const hasPreterm = q.priorComplications.includes("preterm");

  const miscarriages = q.pastPregnancyLoss === "1" ? 1 : q.pastPregnancyLoss === "2+" ? 2 : 0;
  const stillbirths = q.pastPregnancyLoss === "stillbirth" ? 1 : 0;

  const derivedRiskFlags: string[] = [];
  if (q.previousDeliveryMode === "LSCS") derivedRiskFlags.push("Previous LSCS (Scar Monitoring)");
  if (hasPreeclampsia) derivedRiskFlags.push("Prior Preeclampsia / Toxemia");
  if (hasGDM) derivedRiskFlags.push("Prior Gestational Diabetes (GDM)");
  if (hasPPH) derivedRiskFlags.push("Prior Postpartum Hemorrhage (PPH Alert)");
  if (hasPreterm) derivedRiskFlags.push("Prior Preterm Delivery");
  if (miscarriages >= 2) derivedRiskFlags.push("Bad Obstetric History (Recurrent Pregnancy Loss)");
  if (stillbirths > 0) derivedRiskFlags.push("Prior Intrauterine Fetal Demise (IUFD / Stillbirth)");
  if (q.pastBirthWeight === "low") derivedRiskFlags.push("History of Low Birth Weight / FGR");
  if (q.interpregnancyInterval === "<18m" && q.previousDeliveryMode === "LSCS") {
    derivedRiskFlags.push("Short Interpregnancy Interval (<18m) post-LSCS");
  }
  if (q.chronicConditions.includes("hypertension")) derivedRiskFlags.push("Chronic Pre-existing Hypertension");
  if (q.chronicConditions.includes("thyroid")) derivedRiskFlags.push("Maternal Thyroid Disorder");
  if (q.chronicConditions.includes("cardiac")) derivedRiskFlags.push("Heart Disease in Pregnancy (High Risk)");

  let pastNotes = isPrimi
    ? "Primigravida. No past obstetric interventions or surgical scars on the uterus."
    : `Multigravida (G${gravida}P${para}). Previous delivery: ${q.previousDeliveryMode}.`;

  if (q.priorComplications.length > 0 && !q.priorComplications.includes("none")) {
    pastNotes += ` Prior complications noted: ${q.priorComplications.join(", ").toUpperCase()}.`;
  }
  if (q.doctorNotes?.trim()) {
    pastNotes += ` Clinician Note: ${q.doctorNotes.trim()}`;
  }

  const pastHistory: PastObstetricHistory = {
    previousDeliveryMode: deliveryModeMap[q.previousDeliveryMode] || "None (Primi)",
    pastPreEclampsia: hasPreeclampsia,
    pastGDM: hasGDM,
    pastPPH: hasPPH,
    pastMiscarriages: miscarriages,
    pastStillbirths: stillbirths,
    pastLowBirthWeight: q.pastBirthWeight === "low",
    interPregnancyMonths: q.interpregnancyInterval === "<18m" ? 12 : q.interpregnancyInterval === "18m-5y" ? 36 : 60,
    notes: pastNotes,
  };

  const familyHistory: FamilyPregnancyHistory = {
    familyPreEclampsia: q.familyComplications.includes("preeclampsia"),
    familyDiabetes: q.familyComplications.includes("diabetes"),
    familyTwins: q.familyComplications.includes("twins"),
    familyGeneticAnomalies: q.familyComplications.includes("anemia"),
    familyHypertension: q.familyComplications.includes("preeclampsia"),
    notes:
      q.familyComplications.length === 0 || q.familyComplications.includes("none")
        ? "No reported first-degree family history of severe preeclampsia, eclampsia, early onset diabetes, or recurrent pregnancy loss."
        : `Reported familial risk factors: ${q.familyComplications.map((c) => c.toUpperCase()).join(", ")}. Closer surveillance advised.`,
  };

  return { pastHistory, familyHistory, derivedRiskFlags };
}
