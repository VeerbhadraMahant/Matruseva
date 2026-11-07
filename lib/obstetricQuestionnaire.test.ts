import { describe, it, expect } from "vitest";
import {
  questionnaireToObstetricReport,
  type ObstetricQuestionnaireData,
} from "./obstetricQuestionnaire";

describe("obstetricQuestionnaire", () => {
  it("correctly converts primigravida default answers", () => {
    const primiData: ObstetricQuestionnaireData = {
      previousDeliveryMode: "Primi",
      priorComplications: ["none"],
      pastPregnancyLoss: "0",
      pastBirthWeight: "na",
      interpregnancyInterval: "na",
      familyComplications: ["none"],
      chronicConditions: ["none"],
    };

    const res = questionnaireToObstetricReport(primiData, 1, 0);
    expect(res.pastHistory.previousDeliveryMode).toBe("None (Primi)");
    expect(res.pastHistory.pastPreEclampsia).toBe(false);
    expect(res.pastHistory.pastMiscarriages).toBe(0);
    expect(res.familyHistory.familyPreEclampsia).toBe(false);
    expect(res.derivedRiskFlags.length).toBe(0);
  });

  it("correctly flags previous LSCS and prior pre-eclampsia", () => {
    const highRiskData: ObstetricQuestionnaireData = {
      previousDeliveryMode: "LSCS",
      priorComplications: ["preeclampsia", "pph"],
      pastPregnancyLoss: "2+",
      pastBirthWeight: "low",
      interpregnancyInterval: "<18m",
      familyComplications: ["diabetes", "preeclampsia"],
      chronicConditions: ["hypertension"],
      doctorNotes: "Advising elective repeat LSCS.",
    };

    const res = questionnaireToObstetricReport(highRiskData, 3, 1);
    expect(res.pastHistory.previousDeliveryMode).toBe("LSCS");
    expect(res.pastHistory.pastPreEclampsia).toBe(true);
    expect(res.pastHistory.pastPPH).toBe(true);
    expect(res.pastHistory.pastMiscarriages).toBe(2);
    expect(res.pastHistory.pastLowBirthWeight).toBe(true);
    expect(res.familyHistory.familyPreEclampsia).toBe(true);
    expect(res.familyHistory.familyDiabetes).toBe(true);

    expect(res.derivedRiskFlags).toContain("Previous LSCS (Scar Monitoring)");
    expect(res.derivedRiskFlags).toContain("Prior Preeclampsia / Toxemia");
    expect(res.derivedRiskFlags).toContain("Prior Postpartum Hemorrhage (PPH Alert)");
    expect(res.derivedRiskFlags).toContain("Bad Obstetric History (Recurrent Pregnancy Loss)");
    expect(res.derivedRiskFlags).toContain("Short Interpregnancy Interval (<18m) post-LSCS");
    expect(res.derivedRiskFlags).toContain("Chronic Pre-existing Hypertension");
  });
});
