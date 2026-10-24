import { describe, it, expect } from "vitest";
import { generateCounseling, getPregnancyMonth, type CounselingPatientData } from "./voiceCounselor";

describe("voiceCounselor", () => {
  const mockPatient: CounselingPatientData = {
    patientId: "p-test-1",
    patientName: "Pooja Deshmukh",
    phone: "9876543210",
    age: 26,
    gaWeeks: 28,
    trimester: 3,
    bpSys: 142,
    bpDia: 92,
    hb: 8.8,
    clinicName: "MatruSetu District Hospital",
    nextVisitDate: "2026-11-05",
  };

  it("calculates correct pregnancy month from weeks", () => {
    expect(getPregnancyMonth(4)).toBe(1);
    expect(getPregnancyMonth(12)).toBe(3);
    expect(getPregnancyMonth(24)).toBe(6);
    expect(getPregnancyMonth(28)).toBe(7);
    expect(getPregnancyMonth(38)).toBe(9);
  });

  it("generates Hindi counseling with anemia and high BP guidance", () => {
    const counseling = generateCounseling(mockPatient, "hi");
    expect(counseling.language).toBe("hi");
    expect(counseling.nativeLabel).toBe("हिंदी");
    expect(counseling.speechText).toContain("Pooja Deshmukh");
    expect(counseling.speechText).toContain("28वां सप्ताह");
    expect(counseling.speechText).toContain("हीमोग्लोबिन 8.8");
    expect(counseling.speechText).toContain("रक्तचाप (BP) 142/92");
    expect(counseling.dangerSigns.length).toBeGreaterThan(4);
    expect(counseling.whatsappMessage).toContain("*Pooja Deshmukh जी*");
  });

  it("generates Marathi counseling with Marathi terminology", () => {
    const counseling = generateCounseling(mockPatient, "mr");
    expect(counseling.language).toBe("mr");
    expect(counseling.nativeLabel).toBe("मराठी");
    expect(counseling.speechText).toContain("Pooja Deshmukh ताई");
    expect(counseling.speechText).toContain("28वा आठवडा");
    expect(counseling.speechText).toContain("हिमोग्लोबिन 8.8");
    expect(counseling.speechText).toContain("रक्तदाब (BP) 142/92");
    expect(counseling.sections.length).toBe(5);
  });

  it("generates Gujarati counseling with Gujarati terminology", () => {
    const counseling = generateCounseling(mockPatient, "gu");
    expect(counseling.language).toBe("gu");
    expect(counseling.nativeLabel).toBe("ગુજરાતી");
    expect(counseling.speechText).toContain("Pooja Deshmukh બહેન");
    expect(counseling.speechText).toContain("28મું અઠવાડિયું");
    expect(counseling.speechText).toContain("હિમોગ્લોબિન 8.8");
  });

  it("generates English counseling with clinical guidance", () => {
    const counseling = generateCounseling(mockPatient, "en");
    expect(counseling.language).toBe("en");
    expect(counseling.speechText).toContain("Pooja Deshmukh");
    expect(counseling.speechText).toContain("28 weeks of pregnancy");
    expect(counseling.speechText).toContain("hemoglobin is 8.8 g/dL");
    expect(counseling.speechText).toContain("blood pressure today recorded at 142/92");
  });

  it("incorporates custom doctor notes if provided", () => {
    const withCustom = {
      ...mockPatient,
      doctorCustomNote: "Next ultrasound scan booked for Monday at 10 AM.",
    };
    const counseling = generateCounseling(withCustom, "en");
    expect(counseling.speechText).toContain("Next ultrasound scan booked for Monday at 10 AM.");
  });
});
