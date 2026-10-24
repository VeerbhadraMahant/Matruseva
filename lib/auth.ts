import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface CurrentUser {
  userId: string;
  clinicId: string;
  clinicName: string;
  fullName: string;
  role: "doctor" | "staff";
  isDemo?: boolean;
}

export function isDemoActive(cookieStore?: { get(name: string): { value?: string } | undefined }): boolean {
  if (cookieStore?.get("matrusetu_demo")?.value === "1") return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.includes("xxxxxxxx") || url.includes("your-project")) return true;
  return false;
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
      fullName: "Dr. Demo",
      role: "doctor",
      isDemo: true,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, full_name, role, clinics(name)")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  return {
    userId,
    clinicId: profile.clinic_id,
    clinicName: (profile.clinics as { name: string } | null)?.name ?? "",
    fullName: profile.full_name,
    role: profile.role as CurrentUser["role"],
  };
});
