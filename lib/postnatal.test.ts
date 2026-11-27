import { describe, expect, it } from "vitest";
import {
  babyFindingsSchema,
  birthVaccineStatus,
  buildPostnatalVisits,
  dayOfLife,
  gestationalWeeksAtBirth,
  latestMotherFindings,
  motherFindingsSchema,
  motherFlags,
  newbornFlags,
  newbornInputSchema,
  postnatalVisitStatus,
  URGENT_FLAGS,
  type BabyFindings,
  type MotherFindings,
  type PostnatalVisitCode,
} from "./postnatal";

const mother = (p: Record<string, unknown> = {}): MotherFindings => motherFindingsSchema.parse(p);
const baby = (p: Record<string, unknown> = {}): BabyFindings => babyFindingsSchema.parse(p);

describe("buildPostnatalVisits", () => {
  it("counts windows from the delivery date across a month boundary", () => {
    expect(buildPostnatalVisits("2026-01-29")).toEqual([
      { code: "PNC_D3", due_from: "2026-01-31", due_to: "2026-02-02" },
      { code: "PNC_D7", due_from: "2026-02-04", due_to: "2026-02-07" },
      { code: "PNC_D14", due_from: "2026-02-11", due_to: "2026-02-15" },
      { code: "PNC_D42", due_from: "2026-03-10", due_to: "2026-03-19" },
    ]);
  });

  it("crosses a year boundary", () => {
    expect(buildPostnatalVisits("2026-12-30")[0]).toEqual({
      code: "PNC_D3",
      due_from: "2027-01-01",
      due_to: "2027-01-03",
    });
  });
});

describe("postnatalVisitStatus", () => {
  const v = { due_from: "2026-02-04", due_to: "2026-02-07", completed_at: null };

  it("is inclusive at both window edges", () => {
    expect(postnatalVisitStatus(v, "2026-02-03")).toBe("upcoming");
    expect(postnatalVisitStatus(v, "2026-02-04")).toBe("due");
    expect(postnatalVisitStatus(v, "2026-02-07")).toBe("due");
    expect(postnatalVisitStatus(v, "2026-02-08")).toBe("overdue");
  });

  it("is done whenever completed, even if late", () => {
    expect(postnatalVisitStatus({ ...v, completed_at: "2026-02-20T10:00:00+05:30" }, "2026-03-01")).toBe("done");
  });
});

describe("birthVaccineStatus", () => {
  const birth = "2026-02-01";
  const pending = { given_on: null, given_elsewhere: false };

  it("is due up to and including the overdue-after day, overdue after", () => {
    expect(birthVaccineStatus({ vaccine: "HEPB0", ...pending }, birth, "2026-02-02")).toBe("due"); // day 1
    expect(birthVaccineStatus({ vaccine: "HEPB0", ...pending }, birth, "2026-02-03")).toBe("overdue"); // day 2
    expect(birthVaccineStatus({ vaccine: "OPV0", ...pending }, birth, "2026-02-16")).toBe("due"); // day 15
    expect(birthVaccineStatus({ vaccine: "OPV0", ...pending }, birth, "2026-02-17")).toBe("overdue"); // day 16
    expect(birthVaccineStatus({ vaccine: "BCG", ...pending }, birth, "2026-03-15")).toBe("due"); // day 42
    expect(birthVaccineStatus({ vaccine: "BCG", ...pending }, birth, "2026-03-16")).toBe("overdue"); // day 43
  });

  it("is given when given_on is set or given elsewhere", () => {
    expect(birthVaccineStatus({ vaccine: "BCG", given_on: "2026-02-01", given_elsewhere: false }, birth, "2026-06-01")).toBe("given");
    expect(birthVaccineStatus({ vaccine: "BCG", given_on: null, given_elsewhere: true }, birth, "2026-06-01")).toBe("given");
  });
});

describe("dates", () => {
  it("counts day of life", () => {
    expect(dayOfLife("2026-02-01", "2026-02-01")).toBe(0);
    expect(dayOfLife("2026-01-30", "2026-02-02")).toBe(3);
  });

  it("floors gestational weeks at birth", () => {
    expect(gestationalWeeksAtBirth("2026-01-01", "2026-10-08")).toBe(40); // 280 days
    expect(gestationalWeeksAtBirth("2026-01-01", "2026-10-07")).toBe(39); // 279 days
    expect(gestationalWeeksAtBirth("2026-01-01", "2026-08-12")).toBe(31); // 223 days
    expect(gestationalWeeksAtBirth("2026-01-01", "2026-08-13")).toBe(32); // 224 days
  });
});

type Visit = {
  code: PostnatalVisitCode;
  completed_at: string | null;
  baby_findings: Record<string, BabyFindings>;
};
const visit = (code: PostnatalVisitCode, findings: Record<string, BabyFindings>, done = true): Visit => ({
  code,
  completed_at: done ? "2026-02-10T09:00:00+05:30" : null,
  baby_findings: findings,
});

const nb = (p: Partial<{ birth_weight_kg: number; gestational_age_weeks: number | null; nicu_admission: boolean }> = {}) => ({
  id: "b1",
  birth_weight_kg: 3,
  gestational_age_weeks: 39,
  nicu_admission: false,
  ...p,
});

describe("newbornFlags", () => {
  it("has no flags for a healthy term baby", () => {
    expect(newbornFlags(nb(), [])).toEqual([]);
  });

  it("applies weight bands with exclusive vlbw/lbw", () => {
    expect(newbornFlags(nb({ birth_weight_kg: 1.49 }), [])).toEqual(["vlbw"]);
    expect(newbornFlags(nb({ birth_weight_kg: 1.5 }), [])).toEqual(["lbw"]);
    expect(newbornFlags(nb({ birth_weight_kg: 2.49 }), [])).toEqual(["lbw"]);
    expect(newbornFlags(nb({ birth_weight_kg: 2.5 }), [])).toEqual([]);
  });

  it("applies gestational bands with exclusive very_preterm/preterm", () => {
    expect(newbornFlags(nb({ gestational_age_weeks: 31 }), [])).toEqual(["very_preterm"]);
    expect(newbornFlags(nb({ gestational_age_weeks: 32 }), [])).toEqual(["preterm"]);
    expect(newbornFlags(nb({ gestational_age_weeks: 36 }), [])).toEqual(["preterm"]);
    expect(newbornFlags(nb({ gestational_age_weeks: 37 }), [])).toEqual([]);
  });

  it("gives no gestational flag when GA is unknown", () => {
    expect(newbornFlags(nb({ gestational_age_weeks: null }), [])).toEqual([]);
  });

  it("flags NICU admission", () => {
    expect(newbornFlags(nb({ nicu_admission: true }), [])).toEqual(["nicu"]);
  });

  it("flags danger signs and poor feeding from the latest visit only", () => {
    const sick = baby({ danger_signs: ["fever"], feeding: "poor" });
    const well = baby({ feeding: "exclusive_breast" });
    expect(newbornFlags(nb(), [visit("PNC_D3", { b1: sick })])).toEqual(["danger_sign", "poor_feeding"]);
    // later visit is fine, so the earlier problem no longer flags
    expect(newbornFlags(nb(), [visit("PNC_D3", { b1: sick }), visit("PNC_D7", { b1: well })])).toEqual([]);
  });

  it("orders by schedule, not array order, and ignores uncompleted visits and other babies", () => {
    const sick = baby({ danger_signs: ["lethargy"] });
    const well = baby();
    expect(newbornFlags(nb(), [visit("PNC_D7", { b1: well }), visit("PNC_D3", { b1: sick })])).toEqual([]);
    expect(newbornFlags(nb(), [visit("PNC_D3", { b1: well }), visit("PNC_D7", { b1: sick }, false)])).toEqual([]);
    expect(newbornFlags(nb(), [visit("PNC_D3", { b2: sick })])).toEqual([]);
  });

  it("flags weight below birth weight at day 14 or 42 only", () => {
    expect(newbornFlags(nb(), [visit("PNC_D14", { b1: baby({ weight_kg: 2.9 }) })])).toEqual(["weight_not_regained"]);
    expect(newbornFlags(nb(), [visit("PNC_D42", { b1: baby({ weight_kg: 2.9 }) })])).toEqual(["weight_not_regained"]);
    expect(newbornFlags(nb(), [visit("PNC_D14", { b1: baby({ weight_kg: 3 }) })])).toEqual([]);
    expect(newbornFlags(nb(), [visit("PNC_D7", { b1: baby({ weight_kg: 2.7 }) })])).toEqual([]);
    expect(newbornFlags(nb(), [visit("PNC_D14", { b1: baby({ weight_kg: 2.9 }) }, false)])).toEqual([]);
    // regained by day 42
    expect(
      newbornFlags(nb(), [visit("PNC_D14", { b1: baby({ weight_kg: 2.9 }) }), visit("PNC_D42", { b1: baby({ weight_kg: 3.6 }) })]),
    ).toEqual([]);
  });
});

describe("motherFlags", () => {
  it("returns nothing for no findings", () => {
    expect(motherFlags(null)).toEqual([]);
    expect(motherFlags(mother())).toEqual([]);
  });

  it("flags high BP at the 140/90 thresholds", () => {
    expect(motherFlags(mother({ bp_systolic: 139, bp_diastolic: 89 }))).toEqual([]);
    expect(motherFlags(mother({ bp_systolic: 140, bp_diastolic: 80 }))).toEqual(["high_bp"]);
    expect(motherFlags(mother({ bp_systolic: 120, bp_diastolic: 90 }))).toEqual(["high_bp"]);
  });

  it("flags fever at 38.0", () => {
    expect(motherFlags(mother({ temperature_c: 37.9 }))).toEqual([]);
    expect(motherFlags(mother({ temperature_c: 38 }))).toEqual(["fever"]);
  });

  it("maps booleans and merges the two depression questions into low_mood", () => {
    expect(motherFlags(mother({ low_mood: true }))).toEqual(["low_mood"]);
    expect(motherFlags(mother({ loss_of_interest: true }))).toEqual(["low_mood"]);
    expect(motherFlags(mother({ low_mood: true, loss_of_interest: true }))).toEqual(["low_mood"]);
    expect(
      motherFlags(mother({ heavy_bleeding: true, wound_problem: true, breast_problem: true })),
    ).toEqual(["heavy_bleeding", "wound_problem", "breast_problem"]);
  });

  it("marks danger_sign, heavy_bleeding and high_bp as urgent", () => {
    expect([...URGENT_FLAGS].sort()).toEqual(["danger_sign", "heavy_bleeding", "high_bp"]);
  });
});

describe("latestMotherFindings", () => {
  const mv = (code: PostnatalVisitCode, f: MotherFindings | null, done = true) => ({
    code,
    completed_at: done ? "2026-02-10T09:00:00+05:30" : null,
    mother_findings: f,
  });

  it("returns the latest completed visit by schedule order, else null", () => {
    const d3 = mother({ heavy_bleeding: true });
    const d14 = mother({ temperature_c: 38.5 });
    expect(latestMotherFindings([])).toBeNull();
    expect(latestMotherFindings([mv("PNC_D3", d3, false)])).toBeNull();
    expect(latestMotherFindings([mv("PNC_D14", d14), mv("PNC_D3", d3)])).toBe(d14);
    expect(latestMotherFindings([mv("PNC_D14", d14, false), mv("PNC_D3", d3)])).toBe(d3);
  });
});

describe("schemas", () => {
  it("newbornInputSchema coerces numeric strings and treats blanks as absent", () => {
    const r = newbornInputSchema.parse({ name: "", sex: "", birth_weight_kg: "2.85" });
    expect(r).toEqual({ name: undefined, sex: undefined, birth_weight_kg: 2.85, nicu_admission: false });
  });

  it("newbornInputSchema rejects out-of-range weight and unknown sex", () => {
    expect(newbornInputSchema.safeParse({ birth_weight_kg: 0.4 }).success).toBe(false);
    expect(newbornInputSchema.safeParse({ birth_weight_kg: 6.6 }).success).toBe(false);
    expect(newbornInputSchema.safeParse({ birth_weight_kg: "abc" }).success).toBe(false);
    expect(newbornInputSchema.safeParse({ birth_weight_kg: 3, sex: "x" }).success).toBe(false);
  });

  it("motherFindingsSchema accepts empty optional fields and numeric strings", () => {
    const r = motherFindingsSchema.parse({ bp_systolic: "", bp_diastolic: null, temperature_c: "37.2", fp_method: "" });
    expect(r.bp_systolic).toBeUndefined();
    expect(r.bp_diastolic).toBeUndefined();
    expect(r.temperature_c).toBe(37.2);
    expect(r.fp_method).toBeUndefined();
    expect(r.heavy_bleeding).toBe(false);
  });

  it("motherFindingsSchema rejects out-of-range values", () => {
    expect(motherFindingsSchema.safeParse({ bp_systolic: 59 }).success).toBe(false);
    expect(motherFindingsSchema.safeParse({ bp_systolic: 251 }).success).toBe(false);
    expect(motherFindingsSchema.safeParse({ bp_diastolic: 29 }).success).toBe(false);
    expect(motherFindingsSchema.safeParse({ bp_diastolic: 161 }).success).toBe(false);
    expect(motherFindingsSchema.safeParse({ temperature_c: 33.9 }).success).toBe(false);
    expect(motherFindingsSchema.safeParse({ temperature_c: 43.1 }).success).toBe(false);
    expect(motherFindingsSchema.safeParse({ fp_method: "magic" }).success).toBe(false);
  });

  it("babyFindingsSchema defaults danger_signs and validates ranges", () => {
    expect(babyFindingsSchema.parse({ weight_kg: "", feeding: "" })).toEqual({
      weight_kg: undefined,
      feeding: undefined,
      danger_signs: [],
    });
    expect(babyFindingsSchema.safeParse({ weight_kg: 0.4 }).success).toBe(false);
    expect(babyFindingsSchema.safeParse({ weight_kg: 8.1 }).success).toBe(false);
    expect(babyFindingsSchema.safeParse({ feeding: "never" }).success).toBe(false);
    expect(babyFindingsSchema.safeParse({ danger_signs: ["sneezing"] }).success).toBe(false);
  });
});
