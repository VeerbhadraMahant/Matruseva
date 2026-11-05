import { describe, expect, it } from "vitest";
import { PAGE_SIZE, nextLimit, remainingCount } from "./paging";

describe("paging", () => {
  it("advances by a page and clamps to total", () => {
    expect(nextLimit(PAGE_SIZE, 200)).toBe(100);
    expect(nextLimit(100, 120)).toBe(120);
    expect(nextLimit(0, 0)).toBe(0);
  });
  it("counts remaining items", () => {
    expect(remainingCount(120, 50)).toBe(70);
    expect(remainingCount(30, 50)).toBe(0);
  });
});
