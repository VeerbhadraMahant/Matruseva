import { describe, expect, it } from "vitest";
import { eddFromLmp, gestationalAge, gestationalAgeWeeksDecimal, trimester, dateAtWeek, formatGA } from "./pregnancy";

describe("eddFromLmp", () => {
  it("adds 280 days (Naegele's rule)", () => {
    expect(eddFromLmp(new Date(2026, 0, 1))).toEqual(new Date(Date.UTC(2026, 9, 8)));
  });

  it("handles a leap-year February correctly", () => {
    // LMP 2027-05-02 crosses Feb 2028 (a leap year) within the 280-day window
    const edd = eddFromLmp(new Date(2027, 4, 2));
    expect(edd).toEqual(new Date(Date.UTC(2028, 1, 6)));
  });
});

describe("gestationalAge", () => {
  it("computes completed weeks and remainder days", () => {
    const lmp = new Date(2026, 0, 1);
    const today = new Date(2026, 2, 26); // 84 days later = 12w0d
    const ga = gestationalAge(lmp, today);
    expect(ga).toEqual({ days: 84, weeks: 12, daysRemainder: 0 });
    expect(formatGA(ga)).toBe("12w0d");
  });

  it("never returns negative days for a future LMP typo", () => {
    const lmp = new Date(2027, 0, 1);
    const today = new Date(2026, 0, 1);
    expect(gestationalAge(lmp, today).days).toBe(0);
  });
});

describe("gestationalAgeWeeksDecimal", () => {
  it("matches schedule-window style fractional weeks", () => {
    const lmp = new Date(2026, 0, 1);
    const today = dateAtWeek(lmp, 13.85); // 13w6d
    expect(gestationalAgeWeeksDecimal(lmp, today)).toBeCloseTo(13.857, 2);
  });
});

describe("trimester", () => {
  it("buckets by completed weeks", () => {
    expect(trimester({ days: 0, weeks: 0, daysRemainder: 0 })).toBe(1);
    expect(trimester({ days: 0, weeks: 12, daysRemainder: 6 })).toBe(1);
    expect(trimester({ days: 0, weeks: 13, daysRemainder: 0 })).toBe(2);
    expect(trimester({ days: 0, weeks: 26, daysRemainder: 6 })).toBe(2);
    expect(trimester({ days: 0, weeks: 27, daysRemainder: 0 })).toBe(3);
  });
});

describe("dateAtWeek", () => {
  it("rounds fractional weeks to the nearest day", () => {
    const lmp = new Date(2026, 0, 1);
    // 6 weeks = 42 days
    expect(dateAtWeek(lmp, 6)).toEqual(new Date(Date.UTC(2026, 1, 12)));
  });
});
