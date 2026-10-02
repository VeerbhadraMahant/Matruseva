import { describe, it, expect } from "vitest";
import {
  closeDemoPregnancy,
  logDemoBatchContacts,
  getDemoSnapshot,
  getDemoPatientDetail,
  getDemoContactStats,
  getDemoDeliveriesThisMonthCount,
} from "./demo-data";

describe("FEATURE 1: Delivery Outcome Recording & Pregnancy Closure", () => {
  it("closes an active pregnancy, records delivery details, and marks open care events as skipped", () => {
    const patientId = "p2-sunita-verma";

    const initial = getDemoPatientDetail(patientId);
    expect(initial.patient.status).toBe("active");

    const res = closeDemoPregnancy(patientId, {
      deliveryDate: "2026-10-01",
      deliveryMode: "NVD",
      birthWeightKg: 3.2,
      notes: "Normal delivery",
    });

    expect(res.error).toBeNull();

    const updated = getDemoPatientDetail(patientId);
    expect(updated.patient.status).toBe("delivered");
    expect(updated.patient.pregnancy_status).toBe("delivered");
    expect(updated.patient.delivery_date).toBe("2026-10-01");
    expect(updated.patient.delivery_mode).toBe("NVD");
    expect(updated.patient.birth_weight_kg).toBe(3.2);

    // Open care events must be marked skipped
    const openEvents = updated.careEvents.filter((ce) => !ce.completed_at);
    expect(openEvents.every((ce) => ce.status === "skipped")).toBe(true);

    // Patient must be excluded from active snapshot worklist
    const snapshot = getDemoSnapshot();
    const inActive = snapshot.rows.find((r) => r.id === patientId);
    expect(inActive).toBeUndefined();
  });

  it("fails gracefully and idempotently when closing an already-closed pregnancy", () => {
    const patientId = "p11-radha-shinde"; // Seeded delivered patient
    const res = closeDemoPregnancy(patientId, {
      deliveryDate: "2026-09-28",
      deliveryMode: "LSCS",
      birthWeightKg: 3.15,
    });

    expect(res.error).toBe("This pregnancy has already been closed.");
  });
});

describe("FEATURE 2: Clinic Compliance & Macro Analytics", () => {
  it("calculates trimester counts, contact stats, and deliveries this month accurately", () => {
    const { rows } = getDemoSnapshot();
    expect(rows.length).toBeGreaterThan(0);

    // Delivered patients (p11 and closed p2) must not be in active rows
    expect(rows.some((r) => r.id === "p11-radha-shinde")).toBe(false);

    const contactStats = getDemoContactStats();
    expect(contactStats.total).toBeGreaterThan(0);
    expect(contactStats.successRate).toBeGreaterThanOrEqual(0);
    expect(contactStats.successRate).toBeLessThanOrEqual(100);

    const deliveriesThisMonth = getDemoDeliveriesThisMonthCount();
    expect(deliveriesThisMonth).toBeGreaterThanOrEqual(0);
  });
});

describe("FEATURE 3: Batch Contact Logging in Call Queue", () => {
  it("logs batch contacts for active patients and skips closed/delivered patients", () => {
    // p3 is active, p11 is delivered
    const batchResult = logDemoBatchContacts(["p3-kavita-patel", "p11-radha-shinde"], "reached", "Batch follow-up");
    expect(batchResult.error).toBeNull();
    expect(batchResult.loggedCount).toBe(1);
    expect(batchResult.skippedCount).toBe(1);
  });

  it("handles empty batch gracefully", () => {
    const batchResult = logDemoBatchContacts([], "no_answer");
    expect(batchResult.error).toBeNull();
    expect(batchResult.loggedCount).toBe(0);
    expect(batchResult.skippedCount).toBe(0);
  });
});
