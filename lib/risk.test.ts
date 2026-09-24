import { describe, expect, it } from "vitest";
import { computeFollowUpRisk, type RiskInput } from "./risk";

const base: RiskInput = {
  patientStatus: "active",
  nextVisitDate: null,
  hasOverdueCriticalEvent: false,
  recentContactNoAnswerStreak: 0,
  today: new Date(2026, 5, 1),
  riskAtRiskDays: 7,
  riskLostDays: 21,
};

describe("computeFollowUpRisk", () => {
  it("is on_track with nothing overdue", () => {
    expect(computeFollowUpRisk(base)).toBe("on_track");
  });

  it("ignores non-active patients regardless of other signals", () => {
    expect(
      computeFollowUpRisk({ ...base, patientStatus: "delivered", hasOverdueCriticalEvent: true })
    ).toBe("on_track");
  });

  it("is at_risk when a critical care event is overdue", () => {
    expect(computeFollowUpRisk({ ...base, hasOverdueCriticalEvent: true })).toBe("at_risk");
  });

  it("is at_risk when the next visit is more than riskAtRiskDays late", () => {
    const nextVisitDate = new Date(2026, 4, 20); // 12 days before "today"
    expect(computeFollowUpRisk({ ...base, nextVisitDate })).toBe("at_risk");
  });

  it("is not yet at_risk within the grace window", () => {
    const nextVisitDate = new Date(2026, 4, 27); // 5 days before "today"
    expect(computeFollowUpRisk({ ...base, nextVisitDate })).toBe("on_track");
  });

  it("is lost when the next visit is more than riskLostDays late", () => {
    const nextVisitDate = new Date(2026, 4, 1); // 31 days before "today"
    expect(computeFollowUpRisk({ ...base, nextVisitDate })).toBe("lost");
  });

  it("lost takes priority even if also critically overdue", () => {
    const nextVisitDate = new Date(2026, 4, 1);
    expect(
      computeFollowUpRisk({ ...base, nextVisitDate, hasOverdueCriticalEvent: true })
    ).toBe("lost");
  });

  it("is at_risk after two consecutive no-answer/wrong-number contacts", () => {
    expect(computeFollowUpRisk({ ...base, recentContactNoAnswerStreak: 2 })).toBe("at_risk");
  });

  it("a single no-answer is not enough on its own", () => {
    expect(computeFollowUpRisk({ ...base, recentContactNoAnswerStreak: 1 })).toBe("on_track");
  });
});
