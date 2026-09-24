import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

async function countCareEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  status: "due" | "overdue"
) {
  const { count } = await supabase
    .from("care_event_status")
    .select("*", { count: "exact", head: true })
    .eq("status", status);
  return count ?? 0;
}

async function countRisk(supabase: Awaited<ReturnType<typeof createClient>>, risk: "at_risk" | "lost") {
  const { count } = await supabase
    .from("patient_followup_risk")
    .select("*", { count: "exact", head: true })
    .eq("risk", risk);
  return count ?? 0;
}

function StatCard({ label, value, href, tone }: { label: string; value: number; href: string; tone: "due" | "overdue" | "neutral" }) {
  const toneClass =
    tone === "overdue"
      ? "bg-[var(--color-overdue-surface)] text-[var(--color-overdue)]"
      : tone === "due"
        ? "bg-[var(--color-due-surface)] text-[var(--color-due)]"
        : "bg-[var(--color-surface-1)] text-[var(--color-primary)]";

  return (
    <Link href={href} className={`block rounded-[var(--radius-cards)] p-[var(--space-28)] ${toneClass}`}>
      <p className="text-3xl font-medium">{value}</p>
      <p className="mt-1 text-sm">{label}</p>
    </Link>
  );
}

export default async function TodayPage() {
  const supabase = await createClient();

  const [{ count: activePatients }, due, overdue, atRisk, lost] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }).eq("status", "active"),
    countCareEvents(supabase, "due"),
    countCareEvents(supabase, "overdue"),
    countRisk(supabase, "at_risk"),
    countRisk(supabase, "lost"),
  ]);

  const callQueueSize = overdue + atRisk + lost;

  return (
    <div className="p-[var(--space-42)]">
      <h1 className="mb-1 font-[var(--font-heading)] text-[var(--text-heading)] font-light text-[var(--color-primary)]">
        Today
      </h1>
      <p className="mb-8 text-sm text-[var(--color-charcoal)]">
        {activePatients ?? 0} active {activePatients === 1 ? "patient" : "patients"}
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Overdue" value={overdue} href="/calls" tone="overdue" />
        <StatCard label="Due now" value={due} href="/patients" tone="due" />
        <StatCard label="At risk" value={atRisk} href="/calls" tone="due" />
        <StatCard label="Lost to follow-up" value={lost} href="/calls" tone="overdue" />
        <StatCard label="Call queue" value={callQueueSize} href="/calls" tone="neutral" />
      </div>
    </div>
  );
}
