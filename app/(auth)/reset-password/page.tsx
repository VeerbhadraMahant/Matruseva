import { redirect } from "next/navigation";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import { createClient } from "@/lib/supabase/server";
import { isDemoModeEnabled, isSupabaseConfigured } from "@/lib/demo";

export default async function ResetPasswordPage() {
  if (isDemoModeEnabled() || !isSupabaseConfigured()) redirect("/forgot-password");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/forgot-password?expired=1");

  return <PasswordResetForm update />;
}
