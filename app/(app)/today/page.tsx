import { createClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const supabase = await createClient();
  const { count } = await supabase.from("patients").select("*", { count: "exact", head: true }).eq("status", "active");

  return (
    <div className="p-[var(--spacing-42)]">
      <h1 className="mb-2 font-[var(--font-heading)] text-[var(--text-heading)] font-light text-[var(--color-primary)]">
        Today
      </h1>
      <p className="text-[var(--color-charcoal)]">
        {count ?? 0} active {count === 1 ? "patient" : "patients"}.
      </p>
    </div>
  );
}
