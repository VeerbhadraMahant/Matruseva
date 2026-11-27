"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoSession, isSupabaseConfigured } from "@/lib/demo";
import { createRecoveryProof, RECOVERY_COOKIE, RECOVERY_MAX_AGE } from "@/lib/passwordRecovery";
import { createClient } from "@/lib/supabase/server";

export async function acceptStaffInvite(formData: FormData) {
  const tokenHash = formData.get("tokenHash");
  const expired = "/auth/staff-invite?expired=1";
  const cookieStore = await cookies();
  if (isDemoSession(cookieStore) || !isSupabaseConfigured() || typeof tokenHash !== "string" || !tokenHash) {
    redirect(expired);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type: "invite", token_hash: tokenHash });
  if (error || !data.user || !data.session) redirect(expired);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .eq("role", "staff")
    .maybeSingle();
  const { data: verified } = await supabase.auth.getClaims(data.session.access_token);
  const sessionId = verified?.claims.session_id;
  const proof = typeof sessionId === "string" && profile ? createRecoveryProof(sessionId) : null;
  if (!proof) {
    await supabase.auth.signOut({ scope: "local" });
    redirect(expired);
  }

  cookieStore.set(RECOVERY_COOKIE, proof, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RECOVERY_MAX_AGE,
  });
  redirect("/reset-password");
}
