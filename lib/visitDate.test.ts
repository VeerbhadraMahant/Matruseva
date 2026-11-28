import { describe, expect, it } from "vitest";
import { z } from "zod";
import { normalizeVisitDate } from "./visitDate";

describe("visit date submission compatibility", () => {
  it.each([
    ["2026-12-11", "2026-12-11"],
    ["11/12/2026", "2026-12-11"],
    ["29/02/2024", "2024-02-29"],
  ])("accepts native dates and legacy queued dates: %s", (input, expected) => {
    const value = normalizeVisitDate(input);
    expect(value).toBe(expected);
    expect(z.iso.date().safeParse(value).success).toBe(true);
  });

  it("leaves an optional blank follow-up date blank", () => {
    expect(normalizeVisitDate("")).toBe("");
  });

  it.each(["31/02/2026", "not a date"])("does not disguise an invalid date: %s", (input) => {
    expect(z.iso.date().safeParse(normalizeVisitDate(input)).success).toBe(false);
  });
});
