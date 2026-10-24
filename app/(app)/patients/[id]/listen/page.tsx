import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDemoActive } from "@/lib/auth";
import { getDemoPatientDetail } from "@/lib/demo-data";
import { gestationalAge } from "@/lib/pregnancy";
import { parseLocalDate } from "@/lib/format";
import { todayInClinicTimezone } from "@/lib/today";
import { MotherAudioPlayer } from "@/components/MotherAudioPlayer";
import type { CounselingLanguage } from "@/lib/voiceCounselor";
import type { Database } from "@/lib/supabase/types";

type PatientRecord = Database["public"]["Tables"]["patients"]["Row"];
type VisitRecord = Database["public"]["Tables"]["visits"]["Row"];

export default async function PatientListenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const { lang } = await searchParams;
  const cookieStore = await cookies();
  const isDemo = isDemoActive(cookieStore);
  const supabase = await createClient();

  let patient: PatientRecord | null = null;
  let visits: VisitRecord[] = [];
  let clinicName = "MatruSetu Clinic";

  if (isDemo) {
    const demo = getDemoPatientDetail(id);
    if (!demo) notFound();
    patient = demo.patient as PatientRecord;
    visits = demo.visits.map((v) => ({
      id: v.id,
      patient_id: v.patient_id,
      clinic_id: "00000000-0000-0000-0000-000000000002",
      visit_date: v.visit_date,
      bp_sys: v.bp_sys,
      bp_dia: v.bp_dia,
      hb: v.hb,
      fhr: v.fhr,
      weight: v.weight,
      fundal_height: v.fundal_height,
      ga_weeks: null,
      notes: v.notes,
      next_visit_date: v.next_visit_date,
      created_at: v.created_at,
      created_by: null,
    }));
  } else {
    const [{ data: p }, { data: vList }] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("visits")
        .select("*")
        .eq("patient_id", id)
        .order("visit_date", { ascending: false })
        .limit(1),
    ]);

    if (!p) notFound();
    patient = p;
    visits = vList ?? [];

    if (patient.clinic_id) {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("name")
        .eq("id", patient.clinic_id)
        .maybeSingle();
      if (clinic?.name) clinicName = clinic.name;
    }
  }

  const today = todayInClinicTimezone();
  const lmpDate = patient.lmp ? parseLocalDate(patient.lmp) : null;
  const ga = lmpDate ? gestationalAge(lmpDate, today) : null;
  const latest = visits[0];

  const selectedLang = (["hi", "mr", "gu", "en"].includes(lang || "") ? lang : "hi") as CounselingLanguage;

  return (
    <MotherAudioPlayer
      initialLang={selectedLang}
      patientData={{
        patientId: patient.id,
        patientName: patient.name,
        phone: patient.phone,
        age: patient.age,
        gaWeeks: ga?.weeks ?? null,
        bpSys: latest?.bp_sys ?? null,
        bpDia: latest?.bp_dia ?? null,
        hb: latest?.hb ?? null,
        fhr: latest?.fhr ?? null,
        clinicName: clinicName,
      }}
    />
  );
}
