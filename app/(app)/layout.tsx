import { getCurrentUser } from "@/lib/auth";
import { AppTopBar, AppBottomNav } from "@/components/AppNav";
import { CommandPalette } from "@/components/CommandPalette";
import { Toaster } from "@/components/Toaster";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppTopBar clinicName={me.clinicName} userName={me.fullName} isDoctor={me.role === "doctor"} />
      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      <AppBottomNav />
      <CommandPalette />
      <Toaster />
    </div>
  );
}
