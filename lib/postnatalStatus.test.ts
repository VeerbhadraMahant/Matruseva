import { describe, expect, it } from "vitest";
import { buildPostnatalVisits, postnatalVisitStatuses } from "./postnatal";

// Delivery 2026-02-01: D3 02-03..02-05, D7 02-07..02-10, D14 02-14..02-18, D42 03-13..03-22.
const schedule = (done: string[] = []) =>
  buildPostnatalVisits("2026-02-01").map((v) => ({ ...v, completed_at: done.includes(v.code) ? "2026-02-20T10:00:00+05:30" : null }));

describe("postnatalVisitStatuses", () => {
  it("matches the plain window rules while nothing has been skipped", () => {
    expect(postnatalVisitStatuses(schedule(), "2026-02-01")).toEqual(["upcoming", "upcoming", "upcoming", "upcoming"]);
    expect(postnatalVisitStatuses(schedule(), "2026-02-04")).toEqual(["due", "upcoming", "upcoming", "upcoming"]);
    expect(postnatalVisitStatuses(schedule(["PNC_D3"]), "2026-02-12")).toEqual(["done", "overdue", "upcoming", "upcoming"]);
  });

  it("keeps an overdue visit overdue until the next window opens", () => {
    expect(postnatalVisitStatuses(schedule(["PNC_D3"]), "2026-02-13")).toEqual(["done", "overdue", "upcoming", "upcoming"]);
  });

  it("marks a visit missed once a later visit's window opens", () => {
    expect(postnatalVisitStatuses(schedule(["PNC_D3"]), "2026-02-14")).toEqual(["done", "missed", "due", "upcoming"]);
    expect(postnatalVisitStatuses(schedule(), "2026-02-14")).toEqual(["missed", "missed", "due", "upcoming"]);
  });

  it("marks earlier visits missed when a later visit is completed early", () => {
    expect(postnatalVisitStatuses(schedule(["PNC_D14"]), "2026-02-10")).toEqual(["missed", "missed", "done", "upcoming"]);
  });

  it("never marks a completed visit missed, and a late record makes it done", () => {
    expect(postnatalVisitStatuses(schedule(["PNC_D3", "PNC_D14"]), "2026-02-20")).toEqual(["done", "missed", "done", "upcoming"]);
    expect(postnatalVisitStatuses(schedule(["PNC_D3", "PNC_D7", "PNC_D14"]), "2026-02-20")).toEqual(["done", "done", "done", "upcoming"]);
  });

  it("does not depend on input order", () => {
    const reversed = [...schedule(["PNC_D3"])].reverse();
    expect(postnatalVisitStatuses(reversed, "2026-02-14")).toEqual(["upcoming", "due", "missed", "done"]);
  });

  it("flags the last visit overdue, never missed (nothing comes after it)", () => {
    expect(postnatalVisitStatuses(schedule(["PNC_D3", "PNC_D7", "PNC_D14"]), "2026-03-30")[3]).toBe("overdue");
  });
});
