// Seeds a demo clinic with ~40 synthetic patients spanning trimesters and
// follow-up states, using the same schedule-generation windows as the app's
// default ANC template. All data is fabricated — no real patient information.
//
// Usage: node scripts/seed.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv() {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) process.env[match[1]] ??= match[2].trim();
  }
}
loadEnv();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "demo.doctor@matrusetu.test";
const DEMO_PASSWORD = "DemoClinic123!";

const FIRST_NAMES = [
  "Anita", "Priya", "Sunita", "Kavita", "Meena", "Rekha", "Pooja", "Neha", "Divya", "Shweta",
  "Geeta", "Lata", "Sarita", "Manju", "Nisha", "Kiran", "Usha", "Radha", "Seema", "Vandana",
];
const LAST_NAMES = [
  "Sharma", "Patel", "Reddy", "Singh", "Kumar", "Yadav", "Verma", "Gupta", "Joshi", "Mehta",
];
const VILLAGES = ["Shivpur", "Rampur", "Ganeshpuri", "Kothari Nagar", "Lakshmi Colony", "Nehru Ward"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function toISODate(date) {
  return date.toISOString().slice(0, 10);
}
function weeksAgo(weeks) {
  const d = new Date();
  d.setDate(d.getDate() - Math.round(weeks * 7));
  return d;
}
function addWeeks(date, weeks) {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(weeks * 7));
  return d;
}

async function main() {
  console.log("Ensuring demo doctor account...");
  let clinicId;
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  let user = existingUsers?.users.find((u) => u.email === DEMO_EMAIL);

  if (!user) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = created.user;

    // create_clinic_and_profile() reads auth.uid(), which is null under a
    // service-role call — so seed the clinic/profile/template directly
    // instead of using that RPC (it's meant for the signed-in user).
    const { data: newClinic, error: clinicError } = await supabase
      .from("clinics")
      .insert({ name: "Demo Clinic" })
      .select("id")
      .single();
    if (clinicError) throw clinicError;
    clinicId = newClinic.id;

    await supabase.from("profiles").insert({
      id: user.id,
      clinic_id: clinicId,
      full_name: "Dr. Demo",
      role: "doctor",
    });

    const { data: template } = await supabase
      .from("schedule_templates")
      .insert({ clinic_id: clinicId, name: "Default ANC Schedule", is_default: true })
      .select("id")
      .single();

    const items = [
      ["booking", "Booking visit + labs (CBC, blood group/Rh, TSH, HIV, HBsAg, VDRL, HCV, urine, RBS)", "test", 6, 12, null, true, 10],
      ["dating_scan", "Dating / viability scan", "scan", 6, 10, null, true, 20],
      ["nt_scan", "NT scan + double marker", "scan", 11, 13.85, null, true, 30],
      ["anomaly_scan", "Anomaly scan (TIFFA)", "scan", 18, 22, null, true, 40],
      ["td_1", "Td dose 1", "injection", 16, 24, null, false, 50],
      ["td_2", "Td dose 2", "injection", 20, 28, null, false, 60],
      ["ogtt", "OGTT", "test", 24, 28, null, true, 70],
      ["repeat_cbc", "Repeat CBC", "test", 28, 28, null, false, 80],
      ["anti_d", "Anti-D injection", "injection", 28, 28, "rh_negative", true, 90],
      ["tdap", "Tdap", "injection", 27, 36, null, false, 100],
      ["growth_scan_1", "Growth scan + Doppler", "scan", 28, 32, null, true, 110],
      ["growth_scan_2", "Growth scan + Doppler", "scan", 34, 36, null, true, 120],
    ];
    await supabase.from("schedule_template_items").insert(
      items.map(([code, name, kind, ws, we, condition, critical, sort]) => ({
        template_id: template.id,
        code,
        name,
        kind,
        window_start_week: ws,
        window_end_week: we,
        condition,
        is_critical: critical,
        sort_order: sort,
      }))
    );
    console.log(`Created demo doctor: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } else {
    const { data: profile } = await supabase.from("profiles").select("clinic_id").eq("id", user.id).single();
    clinicId = profile.clinic_id;
    console.log(`Demo doctor already exists (clinic ${clinicId}).`);
  }

  const { count: existingPatients } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinicId);
  if (existingPatients > 0) {
    console.log(`Clinic already has ${existingPatients} patients — skipping (seed is not additive; delete them first to reseed).`);
    return;
  }

  const { data: template } = await supabase
    .from("schedule_templates")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("is_default", true)
    .single();
  const { data: items } = await supabase
    .from("schedule_template_items")
    .select("*")
    .eq("template_id", template.id);

  console.log("Seeding synthetic patients...");
  const PATIENT_COUNT = 40;
  let created = 0;

  for (let i = 0; i < PATIENT_COUNT; i++) {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const lmpWeeksAgo = 2 + Math.random() * 36; // spans all trimesters + some near-term
    const lmp = weeksAgo(lmpWeeksAgo);
    const rhNegative = Math.random() < 0.15;
    const phone = `9${Math.floor(100000000 + Math.random() * 899999999)}`;

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .insert({
        clinic_id: clinicId,
        name,
        phone,
        address: pick(VILLAGES),
        age: 20 + Math.floor(Math.random() * 15),
        gravida: 1 + Math.floor(Math.random() * 3),
        para: Math.floor(Math.random() * 2),
        blood_group: pick(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
        rh_negative: rhNegative,
        lmp: toISODate(lmp),
        edd_source: "lmp",
        status: "active",
      })
      .select("id")
      .single();
    if (patientError) {
      console.error(`Failed to create patient ${i}:`, patientError.message);
      continue;
    }

    const careEvents = items
      .filter((item) => item.condition !== "rh_negative" || rhNegative)
      .map((item) => {
        const dueFrom = addWeeks(lmp, item.window_start_week);
        const dueTo = addWeeks(lmp, item.window_end_week);
        return {
          clinic_id: clinicId,
          patient_id: patient.id,
          template_item_id: item.id,
          name: item.name,
          kind: item.kind,
          due_from: toISODate(dueFrom),
          due_to: toISODate(dueTo),
          // A well-run clinic keeps up with critical items more than routine
          // ones; this keeps most patients on_track while still leaving a
          // realistic minority overdue (an "at risk" critical item only
          // needs to slip once, so completion must be high to avoid nearly
          // every longer-along patient tripping the overdue_critical check).
          completed_at:
            dueTo < new Date() && Math.random() < (item.is_critical ? 0.88 : 0.5)
              ? new Date().toISOString()
              : null,
        };
      });
    await supabase.from("care_events").insert(careEvents);

    // ~20% of patients get a stale next-visit date, to populate at-risk/lost states.
    if (Math.random() < 0.2) {
      const daysStale = Math.random() < 0.5 ? 10 : 30;
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - daysStale);
      await supabase.from("visits").insert({
        patient_id: patient.id,
        clinic_id: clinicId,
        visit_date: toISODate(staleDate),
        next_visit_date: toISODate(staleDate),
        notes: "Synthetic seed data.",
      });
    }

    created++;
  }

  console.log(`Seeded ${created} synthetic patients into clinic ${clinicId}.`);
  console.log(`Sign in at /login with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
