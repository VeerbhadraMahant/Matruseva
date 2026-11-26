import { cookies } from "next/headers";
import { RECOVERY_COOKIE, verifyRecoveryProof } from "@/lib/passwordRecovery";
import { redirect } from "next/navigation";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import { createClient } from "@/lib/supabase/server";
import { isDemoModeEnabled, isSupabaseConfigured } from "@/lib/demo";

export default async function ResetPasswordPage() {
  if (isDemoModeEnabled() || !isSupabaseConfigured()) redirect("/forgot-password");
  const proof = (await cookies()).get(RECOVERY_COOKIE)?.value;
  if (!proof) redirect("/forgot-password?expired=1");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!verifyRecoveryProof(proof, data?.claims.session_id)) redirect("/forgot-password?expired=1");

  return <PasswordResetForm update />;
}
