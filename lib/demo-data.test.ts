import { describe, it, expect } from "vitest";
import {
  addDemoPatient,
  getDemoPatientDetail,
  markDemoCareEventDone,
  recordDemoVisit,
  logDemoContact,
} from "./demo-data";

describe("Demo Data Operations (Zero-Fetch Local Evaluation)", () => {
  it("registers a new demo patient and computes valid gestational age and ANC schedule", () => {
    const newId = addDemoPatient({
      name: "Rani Mukherjee",
      clinicPatientNo: "ANC-999",
      phone: "9876543210",
      age: 27,
      gravida: 2,
      para: 1,
      bloodGroup: "O+",
      rhNegative: false,
      lmp: "2026-08-15",
    });

    expect(newId).toBeDefined();
    expect(newId).toContain("rani-mukherjee");

    const detail = getDemoPatientDetail(newId);
    expect(detail).not.toBeNull();
    expect(detail?.patient.name).toBe("Rani Mukherjee");
    expect(detail?.patient.clinic_patient_no).toBe("ANC-999");
    expect(detail?.patient.lmp).toBe("2026-08-15");
    expect(detail?.careEvents.length).toBeGreaterThanOrEqual(7);
  });

  it("marks care events as done and updates demo patient chart", () => {
    const newId = addDemoPatient({
      name: "Deepa Shah",
      lmp: "2026-09-01",
      rhNegative: false,
    });

    markDemoCareEventDone("ce-1", newId);
    const detail = getDemoPatientDetail(newId);
    const ce1 = detail?.careEvents.find((e) => e.id === "ce-1");
    expect(ce1?.status).toBe("done");
  });

  it("records visits and updates vitals history in demo mode", () => {
    const newId = addDemoPatient({
      name: "Ananya Sen",
      lmp: "2026-07-20",
      rhNegative: false,
    });

    recordDemoVisit(newId, {
      visitDate: "2026-10-15",
      bpSys: 118,
      bpDia: 78,
      weight: 59.2,
      hb: 11.8,
      fhr: 146,
      fundalHeight: 24,
      notes: "Normal progress",
      nextVisitDate: "2026-11-01",
    });

    const detail = getDemoPatientDetail(newId);
    expect(detail?.visits.length).toBeGreaterThanOrEqual(1);
    expect(detail?.visits[0].bp_sys).toBe(118);
    expect(detail?.visits[0].weight).toBe(59.2);
  });

  it("logs contact events in demo mode", () => {
    const newId = addDemoPatient({
      name: "Sneha Nair",
      lmp: "2026-06-10",
      rhNegative: false,
    });

    logDemoContact(newId, "whatsapp", "reached", "Confirmed scan appointment");
    const detail = getDemoPatientDetail(newId);
    expect(detail?.contacts.length).toBeGreaterThanOrEqual(1);
    expect(detail?.contacts[0].outcome).toBe("reached");
  });
});
