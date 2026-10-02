import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClinicSnapshot } from "@/lib/snapshot";
import { trimester } from "@/lib/pregnancy";
import { ClinicAnalyticsSummary } from "@/components/ClinicAnalyticsSummary";
import { HeroCard } from "@/components/today/HeroCard";
import { QuickActions } from "@/components/today/QuickActions";
import { TodayWorklist } from "@/components/today/TodayWorklist";
import { UpcomingDeliveries } from "@/components/today/UpcomingDeliveries";
import { getDemoContactStats, getDemoDeliveriesThisMonthCount } from "@/lib/demo-data";
import { buildWorklist, upcomingDeliveries } from "./view-model";

export default async function TodayPage() {
  const [me, { rows, today }] = await Promise.all([getCurrentUser(), getClinicSnapshot()]);

  const worklist = buildWorklist(rows, today);
  const overduePatients = rows.filter((r) => r.overdue.length > 0);
  const atRiskPatients = rows.filter((r) => r.risk !== "on_track");
  const deliveries = upcomingDeliveries(rows, today);

  const cookieStore = await cookies();
  const isDemo = cookieStore.get("matrusetu_demo")?.value === "1";

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
    const [{ count: delivCount }, { data: contactRows }] = await Promise.all([
      supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .gte("delivery_date", startOfMonth),
      supabase
        .from("contact_log")
        .select("outcome")
        .limit(2000),
    ]);
    deliveriesThisMonth = delivCount ?? 0;
    contactsAttempted = (contactRows ?? []).length;
    contactsReached = (contactRows ?? []).filter((c) => c.outcome === "reached" || c.outcome === "will_visit").length;
    contactSuccessRate = contactsAttempted > 0 ? Math.round((contactsReached / contactsAttempted) * 100) : 0;
  }

  const trimesterCounts = {
    t1: rows.filter((r) => r.ga && trimester(r.ga) === 1).length,
    t2: rows.filter((r) => r.ga && trimester(r.ga) === 2).length,
    t3: rows.filter((r) => r.ga && trimester(r.ga) === 3).length,
  };

  const totalActive = rows.length;
  const overdueMothers = rows.filter((r) => r.overdue.length > 0).length;
  const compliantCount = Math.max(0, totalActive - overdueMothers);
  const complianceRate = totalActive > 0 ? Math.round((compliantCount / totalActive) * 100) : 0;

  const dateLabel = today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="pc-scope min-h-dvh px-4 pb-12 pt-6 md:px-8 md:pt-9">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pc-muted">{dateLabel}</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.02em] md:text-[32px]">
            Welcome back, {me.fullName}
          </h1>
        </header>

        {/* Mobile: one column in priority order. Desktop: worklist left, overview right. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <div className="order-1">
              <HeroCard
                dueToday={worklist.days[0]?.entries.length ?? 0}
                overdue={overduePatients.length}
                atRisk={atRiskPatients.length}
                totalActive={totalActive}
              />
            </div>
            <div className="order-3">
              <TodayWorklist days={worklist.days} rows={worklist.rows} />
            </div>
          </div>

          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <div className="order-2">
              <QuickActions />
            </div>
            <div className="order-4">
              <ClinicAnalyticsSummary
                totalActive={totalActive}
                compliantCount={compliantCount}
                complianceRate={complianceRate}
                trimester={trimesterCounts}
                contactsAttempted={contactsAttempted}
                contactsReached={contactsReached}
                contactSuccessRate={contactSuccessRate}
                overdueCount={overduePatients.length}
                deliveriesThisMonth={deliveriesThisMonth}
              />
            </div>
            <div className="order-5">
              <UpcomingDeliveries items={deliveries.slice(0, 5)} total={deliveries.length} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
