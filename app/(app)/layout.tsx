import { Suspense } from "react";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { AppTopBar, AppBottomNav } from "@/components/AppNav";
import { AppShell } from "@/components/AppShell";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";
import { CallQueueBadge } from "@/components/CallQueueBadge";
import { CommandPalette } from "@/components/CommandPalette";
import { Toaster } from "@/components/Toaster";
import { OfflineSync } from "@/components/OfflineSync";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [me, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <AppShell initialCollapsed={collapsed}>
      <AppTopBar
        clinicName={me.clinicName}
        userName={me.fullName}
        isDoctor={me.role === "doctor"}
        callBadge={
          <Suspense fallback={null}>
            <CallQueueBadge />
          </Suspense>
        }
      />
      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      <AppBottomNav />
      <CommandPalette />
      <Toaster />
      <OfflineSync userId={me.userId} />
    </AppShell>
  );
}
