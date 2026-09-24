import { describe, expect, it } from "vitest";
import { todayInClinicTimezone, toISODate } from "./today";

describe("todayInClinicTimezone", () => {
  it("is already the next IST day just after UTC midnight (IST = UTC+5:30)", () => {
    // 2026-06-15 01:00:00 UTC = 2026-06-15 06:30 IST -> same calendar day
    const justAfterUTCMidnight = new Date("2026-06-15T01:00:00Z");
    expect(toISODate(todayInClinicTimezone(justAfterUTCMidnight))).toBe("2026-06-15");
  });

  it("has already rolled to the next IST day while UTC is still on the previous day", () => {
    // 2026-06-14 19:00:00 UTC = 2026-06-15 00:30 IST -> IST is a day ahead of UTC here
    const lateUTCPreviousDay = new Date("2026-06-14T19:00:00Z");
    expect(toISODate(todayInClinicTimezone(lateUTCPreviousDay))).toBe("2026-06-15");
  });

  it("matches a plain UTC read mid-day when both are on the same date", () => {
    const midDayUTC = new Date("2026-06-15T10:00:00Z");
    expect(toISODate(todayInClinicTimezone(midDayUTC))).toBe("2026-06-15");
  });
});
