import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "matrusetu-postnatal-"));
const storePath = path.join(dir, "store.json");
process.env.MATRUSETU_DEMO_STORE_PATH = storePath;

type Demo = typeof import("./demo-data");

/** Fresh module instance bound to the temp store file (the path is read at import time). */
async function load(initialFile?: object): Promise<Demo> {
  fs.rmSync(storePath, { force: true });
  if (initialFile) fs.writeFileSync(storePath, JSON.stringify(initialFile));
  globalThis.__matrusetu_demo_store__ = undefined;
  globalThis.__matrusetu_demo_snapshot_cache__ = undefined;
  globalThis.__matrusetu_demo_detail_cache__ = undefined;
  vi.resetModules();
  return import("./demo-data");
}

afterAll(() => {
  globalThis.__matrusetu_demo_store__ = undefined;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("demo postnatal data", () => {
  let demo: Demo;
  beforeEach(async () => {
    demo = await load();
  });

  it("closing with twins creates 4 visits and 3 vaccines per baby", () => {
    const res = demo.closeDemoPregnancy("p3-kavita-patel", {
      deliveryDate: "2026-11-20",
      deliveryMode: "LSCS",
      newborns: [
        { birth_weight_kg: 2.1, nicu_admission: true, sex: "male" },
        { birth_weight_kg: 2.4, nicu_admission: false, name: "Asha" },
      ],
      gestationalAgeWeeks: 35,
    });
    expect(res.error).toBeNull();

    const data = demo.getDemoPostnatalData("p3-kavita-patel");
    expect(data.newborns.map((n) => [n.birth_order, n.birth_weight_kg, n.gestational_age_weeks, n.nicu_admission]))
      .toEqual([[1, 2.1, 35, true], [2, 2.4, 35, false]]);
    expect(data.newborns[1].name).toBe("Asha");
    expect(data.visits).toHaveLength(4);
    expect(data.vaccines).toHaveLength(6);
    expect(data.vaccines.every((v) => !v.given_on && !v.given_elsewhere)).toBe(true);
    expect(demo.getDemoPatientDetail("p3-kavita-patel").patient.birth_weight_kg).toBe(2.1);
  });

  it("builds one baby from birthWeightKg when no newborns are passed", () => {
    demo.closeDemoPregnancy("p4-priya-sharma", { deliveryDate: "2026-11-20", deliveryMode: "NVD", birthWeightKg: 3.1 });
    const data = demo.getDemoPostnatalData("p4-priya-sharma");
    expect(data.newborns).toHaveLength(1);
    expect(data.newborns[0].birth_weight_kg).toBe(3.1);
    expect(data.vaccines).toHaveLength(3);
  });

  it("records a visit and a birth vaccine, and edits a newborn", () => {
    demo.closeDemoPregnancy("p6-anita-joshi", { deliveryDate: "2026-11-20", deliveryMode: "NVD", birthWeightKg: 3 });
    const [baby] = demo.getDemoPostnatalData("p6-anita-joshi").newborns;

    expect(demo.recordDemoPostnatalVisit("p6-anita-joshi", "PNC_D3", {
      mother: { heavy_bleeding: true, wound_problem: false, breast_problem: false, low_mood: false, loss_of_interest: false },
      babies: { [baby.id]: { weight_kg: 2.9, danger_signs: [] } },
      notes: "ok",
      completedBy: "u1",
    })).toBe(true);
    const visit = demo.getDemoPostnatalData("p6-anita-joshi").visits.find((v) => v.code === "PNC_D3")!;
    expect(visit.completed_at).not.toBeNull();
    expect(visit.completed_by).toBe("u1");
    expect(visit.mother_findings?.heavy_bleeding).toBe(true);
    expect(visit.baby_findings[baby.id].weight_kg).toBe(2.9);

    expect(demo.setDemoBirthVaccine(baby.id, "BCG", { given_on: "2026-11-21", given_elsewhere: false, batch_no: "B1" })).toBe(true);
    expect(demo.setDemoBirthVaccine("nope", "BCG", { given_on: null, given_elsewhere: false, batch_no: null })).toBe(false);
    const bcg = demo.getDemoPostnatalData("p6-anita-joshi").vaccines.find((v) => v.vaccine === "BCG")!;
    expect(bcg).toMatchObject({ given_on: "2026-11-21", batch_no: "B1" });

    expect(demo.updateDemoNewborn(baby.id, { name: "Isha", sex: "female" })).toBe(true);
    expect(demo.getDemoPostnatalData("p6-anita-joshi").newborns[0]).toMatchObject({ name: "Isha", sex: "female" });
  });

  it("seeds a delivered preterm low-birth-weight patient without touching active patients", () => {
    const seed = demo.getDemoPostnatalData("p11-lata-bhosale");
    expect(seed.patients).toHaveLength(1);
    expect(seed.newborns[0]).toMatchObject({ birth_weight_kg: 2.3, gestational_age_weeks: 36 });
    const done = seed.visits.filter((v) => v.completed_at).map((v) => v.code);
    expect(done).toEqual(["PNC_D3"]);
    expect(seed.vaccines.filter((v) => v.given_on).map((v) => v.vaccine).sort()).toEqual(["HEPB0", "OPV0"]);
    expect(demo.getDemoSnapshot().rows.some((r) => r.id === "p11-lata-bhosale")).toBe(false);
  });
});

describe("demo store files written before postnatal care", () => {
  it("loads with empty postnatal collections defaulted and the seed added", async () => {
    const old = {
      patients: [{ id: "p-old", name: "Old Store", rhNegative: false, weeksPregnant: 20, risk: "on_track", noAnswerStreak: 0 }],
      completedEvents: {},
      visits: {},
      contacts: {},
      documents: [],
    };
    const demo = await load(old);
    const store = demo.getDemoStore();
    expect(store.patients.map((p) => p.id)).toEqual(["p-old", "p11-lata-bhosale"]);
    expect(store.newborns.every((n) => n.patient_id === "p11-lata-bhosale")).toBe(true);
    expect(demo.getDemoPostnatalData("p-old").newborns).toEqual([]);
    // the migrated store was written back
    expect(JSON.parse(fs.readFileSync(storePath, "utf8")).postnatalVisits).toHaveLength(4);
  });
});
