import { cookies } from "next/headers";
import { getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/intl";
import { getCurrentUser, isDemoActive } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClinicSnapshot } from "@/lib/snapshot";
import { hasOverdueItems } from "@/lib/followUp";
import { trimester } from "@/lib/pregnancy";
import { ClinicAnalyticsSummary } from "@/components/ClinicAnalyticsSummary";
import { ActionBar, PageHeader, pageBody } from "@/components/ui";
import { QuickActions } from "@/components/today/QuickActions";
import { TodayWorklist } from "@/components/today/TodayWorklist";
import { UpcomingDeliveries } from "@/components/today/UpcomingDeliveries";
import { getDemoContactStats, getDemoDeliveriesThisMonthCount } from "@/lib/demo-data";
import { buildWorklist, upcomingDeliveries } from "./view-model";

export default async function TodayPage() {
  const [me, { rows, today }, { t, locale }] = await Promise.all([getCurrentUser(), getClinicSnapshot(), getT()]);

  const worklist = buildWorklist(rows, today, t, locale);
  const overdueCount = rows.filter((r) => hasOverdueItems(r.overdue.length)).length;
  const deliveries = upcomingDeliveries(rows, today, locale);

  const cookieStore = await cookies();
  const isDemo = isDemoActive(cookieStore);

  let deliveriesThisMonth = 0;
  let contactsAttempted = 0;
  let contactsReached = 0;
  let contactSuccessRate = 0;

  if (isDemo) {
    const cStats = getDemoContactStats();
    contactsAttempted = cStats.total;
    contactsReached = cStats.reached;
    contactSuccessRate = cStats.successRate;
    deliveriesThisMonth = getDemoDeliveriesThisMonthCount();
  } else {
    const supabase = await createClient();
    const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const [{ count: delivCount }, { count: attemptedCount }, { count: reachedCount }] = await Promise.all([
      supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .gte("delivery_date", startOfMonth),
      supabase.from("contact_log").select("*", { count: "exact", head: true }),
      supabase
        .from("contact_log")
        .select("*", { count: "exact", head: true })
        .in("outcome", ["reached", "will_visit"]),
    ]);
    deliveriesThisMonth = delivCount ?? 0;
    contactsAttempted = attemptedCount ?? 0;
    contactsReached = reachedCount ?? 0;
    contactSuccessRate = contactsAttempted > 0 ? Math.round((contactsReached / contactsAttempted) * 100) : 0;
  }

  const trimesterCounts = {
    t1: rows.filter((r) => r.ga && trimester(r.ga) === 1).length,
    t2: rows.filter((r) => r.ga && trimester(r.ga) === 2).length,
    t3: rows.filter((r) => r.ga && trimester(r.ga) === 3).length,
  };

  const totalActive = rows.length;
  const compliantCount = totalActive - overdueCount;
  const complianceRate = totalActive > 0 ? Math.round((compliantCount / totalActive) * 100) : 0;

  const dateLabel = today.toLocaleDateString(intlLocale(locale), { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader
        title={t("today.welcome", { name: me.fullName })}
        meta={<span className="num">{dateLabel}</span>}
        actions={
          <div className="hidden gap-2 md:flex">
            <QuickActions />
          </div>
        }
      />
      <div className={`${pageBody} pb-24 md:pb-12`}>
        {/* Phone: worklist first, then deliveries, then analytics. Desktop: worklist main, side column. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          <TodayWorklist days={worklist.days} rows={worklist.rows} />
          <div className="space-y-4 md:space-y-5">
            <UpcomingDeliveries items={deliveries.slice(0, 5)} total={deliveries.length} />
            <ClinicAnalyticsSummary
              totalActive={totalActive}
              compliantCount={compliantCount}
              complianceRate={complianceRate}
              trimester={trimesterCounts}
              contactsAttempted={contactsAttempted}
              contactsReached={contactsReached}
              contactSuccessRate={contactSuccessRate}
              overdueCount={overdueCount}
              deliveriesThisMonth={deliveriesThisMonth}
            />
          </div>
        </div>
      </div>
      <div className="md:hidden">
        <ActionBar>
          <QuickActions />
        </ActionBar>
      </div>
    </>
  );
}
