import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getClaimsBounded } from "@/lib/supabase/claims";
import { isDemoSession } from "@/lib/demo";
import { getDemoDoctorProfile } from "@/lib/demo-data";

export interface CurrentUser {
  userId: string;
  clinicId: string;
  clinicName: string;
  fullName: string;
  email?: string;
  profileCreatedAt?: string;
  role: "doctor" | "staff";
  isDemo?: boolean;
}

export function isDemoActive(cookieStore?: { get(name: string): { value?: string } | undefined }): boolean {
  return isDemoSession(cookieStore);
}

// getClaims() verifies the JWT locally against the project's ES256 JWKS, so
// unlike getUser() it costs no Auth-server round trip. cache() dedupes this
// across the layout, page and nested components within one request.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const cookieStore = await cookies();
  const isDemo = isDemoActive(cookieStore);
  if (isDemo) {
    return {
      userId: "demo-doctor-id",
      clinicId: "demo-clinic-id",
      clinicName: "MatruSetu Demo Clinic",
      fullName: getDemoDoctorProfile().fullName,
      role: "doctor",
      isDemo: true,
    };
  }

  const supabase = await createClient();
  const { userId, email } = await getClaimsBounded(supabase);
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, full_name, role, created_at, clinics(name)")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  return {
    userId,
    clinicId: profile.clinic_id,
    clinicName: (profile.clinics as { name: string } | null)?.name ?? "",
    fullName: profile.full_name,
    email,
    profileCreatedAt: profile.created_at,
    role: profile.role as CurrentUser["role"],
  };
});
