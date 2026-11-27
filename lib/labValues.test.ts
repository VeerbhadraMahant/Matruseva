import { describe, expect, it } from "vitest";
import { extractLabValues } from "./labValues";

const by = (text: string, key: string) => extractLabValues(text).find((v) => v.key === key);

describe("extractLabValues", () => {
  it("returns nothing for empty text", () => {
    expect(extractLabValues(null)).toEqual([]);
    expect(extractLabValues("")).toEqual([]);
    expect(extractLabValues("Patient came for review, doing well")).toEqual([]);
  });

  it("reads hemoglobin and flags pregnancy anaemia", () => {
    const hb = by("Hemoglobin: 9.8 g/dL (Mild Anemia)", "hb");
    expect(hb?.display).toBe("9.8 g/dL");
    expect(hb?.status).toBe("review");
    expect(hb?.note).toMatch(/11/);
    expect(by("Hb 12.4 gm%", "hb")?.status).toBe("ok");
    expect(by("HGB - 11", "hb")?.status).toBe("ok");
  });

  it("flags an implausible hemoglobin as a probable OCR error", () => {
    expect(by("Hb: 98", "hb")?.status).toBe("implausible");
  });

  it("reads BP and applies thresholds", () => {
    expect(by("BP 110/70", "bp")).toMatchObject({ display: "110/70 mmHg", status: "ok" });
    expect(by("Blood Pressure: 150 / 96 mmHg", "bp")).toMatchObject({ display: "150/96 mmHg", status: "review" });
    expect(by("BP 70/110", "bp")?.status).toBe("implausible");
    expect(by("BP 400/90", "bp")?.status).toBe("implausible");
  });

  it("separates fasting, post-prandial and random sugar", () => {
    const text = "FBS: 88 mg/dL\nPPBS 156 mg/dL\nBlood Sugar (Random): 112 mg/dL";
    expect(by(text, "fasting_glucose")).toMatchObject({ display: "88 mg/dL", status: "ok" });
    expect(by(text, "pp_glucose")).toMatchObject({ display: "156 mg/dL", status: "review" });
    expect(by(text, "random_glucose")).toMatchObject({ display: "112 mg/dL", status: "ok" });
    expect(by("Fasting blood sugar 101", "fasting_glucose")?.status).toBe("review");
    expect(by("Blood Sugar (Fasting): 90", "fasting_glucose")?.display).toBe("90 mg/dL");
  });

  it("reads TSH and flags values above the pregnancy ceiling", () => {
    expect(by("TSH: 2.4 mIU/L", "tsh")).toMatchObject({ display: "2.4 mIU/L", status: "ok" });
    expect(by("TSH 6.8", "tsh")?.status).toBe("review");
  });

  it("normalises platelet units to per uL", () => {
    expect(by("Platelet count: 2.5 lakh/cumm", "platelets")?.display).toBe("2,50,000 /uL");
    expect(by("Platelets 250 x10^3/uL", "platelets")?.display).toBe("2,50,000 /uL");
    expect(by("PLT: 245000", "platelets")?.status).toBe("ok");
    expect(by("Platelets 90000", "platelets")?.status).toBe("review");
    expect(by("Platelets 2.0 lakhs", "platelets")?.display).toBe("2,00,000 /uL");
    expect(by("Platelets 2 L", "platelets")?.display).toBe("2,00,000 /uL");
  });

  it("reads day-first and ISO dates, drops impossible ones, dedupes", () => {
    const dates = extractLabValues("Date: 15/09/2026 reported 2026-09-15 and 31/02/2026 and 03-11-26").filter((v) => v.key === "date");
    expect(dates.map((d) => d.display)).toEqual(["2026-09-15", "2026-11-03"]);
  });

  it("extracts everything from the demo lab report", () => {
    const text = "PATHOLOGY LAB REPORT\nHemoglobin: 9.8 g/dL (Mild Anemia)\nBlood Group: B Rh Positive\nBlood Sugar (Random): 112 mg/dL\nUrine Routine: Albumin Nil";
    expect(extractLabValues(text).map((v) => v.key)).toEqual(["hb", "random_glucose"]);
  });

  describe("reference ranges next to results", () => {
    const hb = (t: string) => by(t, "hb");
    it("range before result takes the result", () => {
      expect(hb("Hemoglobin 11.0-15.0 g/dL 9.8")).toMatchObject({ display: "9.8 g/dL", status: "review" });
      expect(hb("Hemoglobin (11.0 - 15.0) 9.8 g/dL")?.display).toBe("9.8 g/dL");
      expect(hb("Hemoglobin 11 to 15 g/dL 9.8")?.display).toBe("9.8 g/dL");
    });
    it("range after result takes the result", () => {
      expect(hb("Hemoglobin 12.4 g/dL (11.0-15.0)")).toMatchObject({ display: "12.4 g/dL", status: "ok" });
      expect(hb("Hb 12.4 Ref 11 to 15")?.display).toBe("12.4 g/dL");
    });
    it("result only still works", () => {
      expect(hb("Hb: 12.4")).toMatchObject({ display: "12.4 g/dL", status: "ok" });
    });
    it("range only is never ok", () => {
      const v = hb("Hemoglobin 11.0-15.0 g/dL");
      expect(v?.status).toBe("review");
      expect(v?.note).toMatch(/range|check/i);
    });
    it("several plain numbers are ambiguous, not ok", () => {
      expect(hb("Hb 11 9.8")?.status).toBe("review");
    });
    it("applies to glucose and TSH", () => {
      expect(by("FBS 70-100 mg/dL 131", "fasting_glucose")).toMatchObject({ display: "131 mg/dL", status: "review" });
      expect(by("FBS 70-100 mg/dL", "fasting_glucose")?.status).toBe("review");
      expect(by("TSH 0.4-4.0 mIU/L 6.8", "tsh")).toMatchObject({ display: "6.8 mIU/L", status: "review" });
      expect(by("TSH 0.4-4.0", "tsh")?.status).toBe("review");
    });
  });

  describe("platelet units", () => {
    it("small bare value is not silently lakh", () => {
      const v = by("Platelets 9", "platelets");
      expect(v?.status).toBe("review");
      expect(v?.note).toMatch(/unit/i);
      expect(v?.display).not.toMatch(/9,00,000/);
    });
    it("x10^9/L and 10^3/uL mean thousands per uL", () => {
      expect(by("Platelets 9 x10^9/L", "platelets")).toMatchObject({ display: "9,000 /uL", status: "review" });
      expect(by("PLT 250 10^9/L", "platelets")?.display).toBe("2,50,000 /uL");
      expect(by("Platelets 9 10^3/uL", "platelets")?.display).toBe("9,000 /uL");
    });
    it("explicit lakh forms convert", () => {
      expect(by("Platelets 1.5 lac", "platelets")?.display).toBe("1,50,000 /uL");
    });
  });
});
