import { getCurrentUser } from "@/lib/auth";
import { AppSidebar, AppMobileHeader, AppBottomNav } from "@/components/AppNav";
import { CommandPalette } from "@/components/CommandPalette";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AppMobileHeader />
      <AppSidebar clinicName={me.clinicName} userName={me.fullName} isDoctor={me.role === "doctor"} />
      <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>
      <AppBottomNav />
      <CommandPalette />
    </div>
  );
}
