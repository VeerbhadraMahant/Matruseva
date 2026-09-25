import { describe, expect, it } from "vitest";
import { bpFlag, hbFlag, fhrFlag, patientFlags, sortFlags } from "./clinical";

describe("bpFlag", () => {
  it("is null for normal or missing BP", () => {
    expect(bpFlag(118, 76)).toBeNull();
    expect(bpFlag(null, null)).toBeNull();
  });
  it("flags hypertension at 140 systolic or 90 diastolic", () => {
    expect(bpFlag(140, 80)?.code).toBe("bp_high");
    expect(bpFlag(130, 90)?.code).toBe("bp_high");
    expect(bpFlag(139, 89)).toBeNull();
  });
  it("flags severe hypertension at 160/110", () => {
    expect(bpFlag(160, 95)?.severity).toBe("critical");
    expect(bpFlag(150, 110)?.severity).toBe("critical");
  });
});

describe("hbFlag", () => {
  it("grades anaemia by WHO pregnancy thresholds", () => {
    expect(hbFlag(11.5)).toBeNull();
    expect(hbFlag(10.5)?.code).toBe("hb_mild");
    expect(hbFlag(8.9)?.code).toBe("hb_moderate");
    expect(hbFlag(6.8)?.code).toBe("hb_severe");
  });
});

describe("fhrFlag", () => {
  it("accepts 110–160 inclusive", () => {
    expect(fhrFlag(110)).toBeNull();
    expect(fhrFlag(160)).toBeNull();
    expect(fhrFlag(105)?.code).toBe("fhr_abnormal");
    expect(fhrFlag(172)?.code).toBe("fhr_abnormal");
  });
});

describe("patientFlags", () => {
  it("flags post-dates and post-term by GA", () => {
    const base = { age: 28, gravida: 1, rhNegative: false };
    expect(patientFlags({ ...base, gaWeeks: 40 })).toEqual([]);
    expect(patientFlags({ ...base, gaWeeks: 41 })[0].code).toBe("post_dates");
    expect(patientFlags({ ...base, gaWeeks: 42 })[0].code).toBe("post_term");
  });
  it("flags Rh negative from the blood group even if the checkbox is unset", () => {
    expect(patientFlags({ age: 25, gravida: 1, rhNegative: false, bloodGroup: "B-", gaWeeks: 20 }).map((f) => f.code)).toEqual(["rh_neg"]);
    expect(patientFlags({ age: 25, gravida: 1, rhNegative: false, bloodGroup: "B+", gaWeeks: 20 })).toEqual([]);
  });
  it("adds demographic markers", () => {
    const codes = patientFlags({ age: 36, gravida: 5, rhNegative: true, gaWeeks: 20 }).map((f) => f.code);
    expect(codes).toEqual(["rh_neg", "age_35", "grand_multi"]);
  });
});

describe("sortFlags", () => {
  it("orders critical before warning before info", () => {
    const sorted = sortFlags([
      { code: "a", label: "a", severity: "info" },
      { code: "b", label: "b", severity: "critical" },
      { code: "c", label: "c", severity: "warning" },
    ]);
    expect(sorted.map((f) => f.severity)).toEqual(["critical", "warning", "info"]);
  });
});
