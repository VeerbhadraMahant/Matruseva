import { describe, it, expect } from "vitest";
import { questionnaireFlags, patientFlags } from "./clinical";
import {
  DEFAULT_OBSTETRIC_QUESTIONNAIRE,
  obstetricQuestionnaireSchema,
  parseQuestionnaireForm,
  type ObstetricQuestionnaireData,
} from "./obstetricQuestionnaire";
import { translate } from "./i18n/translate";

const q = (over: Partial<ObstetricQuestionnaireData> = {}): ObstetricQuestionnaireData => ({
  ...DEFAULT_OBSTETRIC_QUESTIONNAIRE,
  ...over,
});
const codes = (over: Partial<ObstetricQuestionnaireData>) => questionnaireFlags(q(over)).map((f) => f.code);

describe("questionnaire schema", () => {
  it("parses an old questionnaire without the new fields, applying defaults", () => {
    const old = {
      previousDeliveryMode: "NVD",
      priorComplications: ["none"],
      pastPregnancyLoss: "0",
      pastBirthWeight: "normal",
      interpregnancyInterval: "18m-5y",
      familyComplications: ["none"],
      chronicConditions: ["none"],
      doctorNotes: "",
    };
    const res = obstetricQuestionnaireSchema.parse(old);
    expect(res.heightCm).toBeUndefined();
    expect(res.bookingWeightKg).toBeUndefined();
    expect(res.previousCaesareans).toBe("0");
    expect(res.multiplePregnancy).toBe("single");
    expect([res.hivStatus, res.syphilisStatus, res.hepBStatus]).toEqual(["unknown", "unknown", "unknown"]);
    expect(questionnaireFlags(old as ObstetricQuestionnaireData)).toEqual([]);
  });

  it("rejects out-of-range height and weight", () => {
    const base = obstetricQuestionnaireSchema.parse({});
    expect(obstetricQuestionnaireSchema.safeParse({ ...base, heightCm: 119 }).success).toBe(false);
    expect(obstetricQuestionnaireSchema.safeParse({ ...base, heightCm: 201 }).success).toBe(false);
    expect(obstetricQuestionnaireSchema.safeParse({ ...base, bookingWeightKg: 29 }).success).toBe(false);
    expect(obstetricQuestionnaireSchema.safeParse({ ...base, heightCm: 120, bookingWeightKg: 200 }).success).toBe(true);
  });

  it("parses the form fields, and returns null when no questionnaire was submitted", () => {
    expect(parseQuestionnaireForm({})).toBeNull();
    const ok = parseQuestionnaireForm({
      q_previousDeliveryMode: "LSCS",
      q_priorComplications: '["none"]',
      q_heightCm: "138",
      q_bookingWeightKg: "",
      q_previousCaesareans: "2+",
      q_multiplePregnancy: "twins",
      q_hivStatus: "positive",
    });
    expect(ok?.success && ok.data).toMatchObject({ heightCm: 138, previousCaesareans: "2+", multiplePregnancy: "twins", hivStatus: "positive" });
    expect(ok?.success && ok.data.bookingWeightKg).toBeUndefined();
    expect(parseQuestionnaireForm({ q_previousDeliveryMode: "Primi", q_heightCm: "50" })?.success).toBe(false);
  });
});

describe("questionnaireFlags thresholds", () => {
  it("short stature fires below 140 cm only", () => {
    expect(codes({ heightCm: 139.9 })).toEqual(["short_stature"]);
    expect(codes({ heightCm: 140 })).toEqual([]);
  });

  it("low weight fires below 45 kg only", () => {
    expect(codes({ bookingWeightKg: 44.9 })).toEqual(["low_weight"]);
    expect(codes({ bookingWeightKg: 45 })).toEqual([]);
  });

  it("previous caesarean: 1 is a warning, 2+ is critical", () => {
    expect(codes({ previousCaesareans: "0" })).toEqual([]);
    const one = questionnaireFlags(q({ previousCaesareans: "1" }));
    expect(one.map((f) => [f.code, f.severity])).toEqual([["prev_caesarean", "warning"]]);
    const many = questionnaireFlags(q({ previousCaesareans: "2+" }));
    expect(many.map((f) => [f.code, f.severity])).toEqual([["prev_caesarean_multiple", "critical"]]);
  });

  it("an LSCS previous delivery mode implies at least one caesarean", () => {
    expect(codes({ previousDeliveryMode: "LSCS", previousCaesareans: "0" })).toEqual(["prev_caesarean"]);
    expect(codes({ previousDeliveryMode: "LSCS", previousCaesareans: "2+" })).toEqual(["prev_caesarean_multiple"]);
    expect(codes({ previousDeliveryMode: "LSCS", previousCaesareans: undefined })).toEqual(["prev_caesarean"]);
  });

  it("multiple pregnancy fires for twins and triplets+, not single", () => {
    expect(codes({ multiplePregnancy: "single" })).toEqual([]);
    expect(codes({ multiplePregnancy: "twins" })).toEqual(["multiple_pregnancy"]);
    expect(codes({ multiplePregnancy: "triplets+" })).toEqual(["multiple_pregnancy"]);
  });

  it("previous stillbirth is a warning; other loss answers do not fire", () => {
    expect(questionnaireFlags(q({ pastPregnancyLoss: "stillbirth" })).map((f) => [f.code, f.severity])).toEqual([["prev_stillbirth", "warning"]]);
    expect(codes({ pastPregnancyLoss: "2+" })).toEqual([]);
  });

  it("each infection fires only when positive", () => {
    expect(codes({ hivStatus: "negative", syphilisStatus: "unknown", hepBStatus: "negative" })).toEqual([]);
    expect(codes({ hivStatus: "positive" })).toEqual(["infection_hiv"]);
    expect(codes({ syphilisStatus: "positive" })).toEqual(["infection_syphilis"]);
    expect(codes({ hepBStatus: "positive" })).toEqual(["infection_hepb"]);
  });
});

describe("patientFlags with questionnaire", () => {
  const base = { age: 28, gravida: 2, rhNegative: false, gaWeeks: 20 };

  it("includes questionnaire flags next to the existing ones and is unchanged without a questionnaire", () => {
    expect(patientFlags(base)).toEqual([]);
    expect(patientFlags({ ...base, questionnaire: null })).toEqual([]);
    const all = patientFlags({ ...base, age: 36, questionnaire: q({ multiplePregnancy: "twins" }) }).map((f) => f.code);
    expect(all).toEqual(["age_35", "multiple_pregnancy"]);
  });

  it("every new flag has an en/hi/mr label", () => {
    const flags = questionnaireFlags(
      q({
        heightCm: 130,
        bookingWeightKg: 40,
        previousCaesareans: "2+",
        multiplePregnancy: "twins",
        pastPregnancyLoss: "stillbirth",
        hivStatus: "positive",
        syphilisStatus: "positive",
        hepBStatus: "positive",
      }),
    );
    expect(flags).toHaveLength(8);
    for (const f of flags) {
      for (const locale of ["en", "hi", "mr"] as const) {
        expect(translate(locale, f.labelKey), `${f.code} ${locale}`).not.toBe(f.labelKey);
      }
    }
  });
});
