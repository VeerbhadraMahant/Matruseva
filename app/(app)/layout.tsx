import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar, AppMobileHeader, AppBottomNav } from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, clinics(name)")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  const clinicName = (profile.clinics as { name: string } | null)?.name ?? "";

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AppMobileHeader />
      <AppSidebar clinicName={clinicName} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <AppBottomNav />
    </div>
  );
}
