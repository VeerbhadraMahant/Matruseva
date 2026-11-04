import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { isDemoActive } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoPatientDetail } from "@/lib/demo-data";
import { verifyListenToken } from "@/lib/listenLink";
import { gestationalAge } from "@/lib/pregnancy";
import { parseLocalDate } from "@/lib/format";
import { todayInClinicTimezone } from "@/lib/today";
import { MotherAudioPlayer } from "@/components/MotherAudioPlayer";

// Public, token-gated page: keep it out of search indexes and never leak the
// token (it is in the URL) via the Referer header.
export const metadata: Metadata = {
  title: "MatruSetu",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function PublicListenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Generic outcome for bad signature, expiry, tampering or missing secret.
  let raw = token;
  try {
    raw = decodeURIComponent(token);
  } catch {
    notFound();
  }
  const link = verifyListenToken(raw);
  if (!link) notFound();

  const cookieStore = await cookies();

  // Only these fields ever leave the server. No phone, address or other PII.
  let name: string;
  let age: number | null;
  let lmp: string | null;
  let clinicName = "MatruSetu Clinic";
  let latest: { bp_sys: number | null; bp_dia: number | null; hb: number | null; fhr: number | null } | null = null;

  if (isDemoActive(cookieStore)) {
    const demo = getDemoPatientDetail(link.patientId);
    if (!demo) notFound();
    name = demo.patient.name;
    age = demo.patient.age;
    lmp = demo.patient.lmp;
    latest = demo.visits[0] ?? null;
  } else {
    const admin = createAdminClient();
    const [{ data: p }, { data: vList }] = await Promise.all([
      admin.from("patients").select("name, age, lmp, clinic_id").eq("id", link.patientId).maybeSingle(),
      admin
        .from("visits")
        .select("bp_sys, bp_dia, hb, fhr")
        .eq("patient_id", link.patientId)
        .order("visit_date", { ascending: false })
        .limit(1),
    ]);
    if (!p) notFound();
    name = p.name;
    age = p.age;
    lmp = p.lmp;
    latest = vList?.[0] ?? null;
    if (p.clinic_id) {
      const { data: clinic } = await admin.from("clinics").select("name").eq("id", p.clinic_id).maybeSingle();
      if (clinic?.name) clinicName = clinic.name;
    }
  }

  const lmpDate = lmp ? parseLocalDate(lmp) : null;
  const ga = lmpDate ? gestationalAge(lmpDate, todayInClinicTimezone()) : null;

  return (
    <MotherAudioPlayer
      publicView
      initialLang={link.lang}
      patientData={{
        patientId: link.patientId,
        patientName: name,
        phone: null,
        age,
        gaWeeks: ga?.weeks ?? null,
        bpSys: latest?.bp_sys ?? null,
        bpDia: latest?.bp_dia ?? null,
        hb: latest?.hb ?? null,
        fhr: latest?.fhr ?? null,
        clinicName,
      }}
    />
  );
}
