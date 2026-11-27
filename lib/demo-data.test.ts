import { describe, it, expect } from "vitest";
import {
  addDemoPatient,
  getDemoPatientDetail,
  markDemoCareEventDone,
  recordDemoVisit,
  logDemoContact,
  getDemoDocuments,
  addDemoDocument,
  assignDemoDocument,
  deleteDemoDocument,
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

  it("adds, searches, and assigns demo documents to patients", () => {
    const doc = addDemoDocument({
      docType: "scan",
      source: "camera",
      ocrText: "Test Ultrasound Scan Report Normal Placenta",
      ocrStatus: "done",
    });

    expect(doc.id).toBeDefined();
    expect(doc.doc_type).toBe("scan");

    const found = getDemoDocuments(undefined, "ultrasound");
    expect(found.some((d) => d.id === doc.id)).toBe(true);

    const assigned = assignDemoDocument(doc.id, "p1-pooja-deshmukh", "scan", "2026-09-22", "ce-p1-overdue-1");
    expect(assigned).toBe(true);

    const updated = getDemoDocuments().find((d) => d.id === doc.id);
    expect(updated?.patient_id).toBe("p1-pooja-deshmukh");
    expect(updated?.patients?.name).toBe("Pooja Deshmukh");
  });

  it("deletes demo documents and removes them from the store", () => {
    const doc = addDemoDocument({
      docType: "report",
      source: "camera",
      patientId: "p1-pooja-deshmukh",
      ocrText: "Temporary document to delete",
      ocrStatus: "done",
    });

    expect(getDemoDocuments().some((d) => d.id === doc.id)).toBe(true);

    const deleted = deleteDemoDocument(doc.id);
    expect(deleted).toEqual({ patientId: "p1-pooja-deshmukh", docType: "report" });
    expect(getDemoDocuments().some((d) => d.id === doc.id)).toBe(false);
    expect(deleteDemoDocument("missing-doc-id")).toBeNull();
  });
});
