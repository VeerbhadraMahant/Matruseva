import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { gestationalAge, formatGA } from "@/lib/pregnancy";
import { todayInClinicTimezone } from "@/lib/today";
import type { FollowUpRisk } from "@/lib/supabase/enums";

const RISK_LABEL: Record<FollowUpRisk, string> = {
  on_track: "On track",
  at_risk: "At risk",
  lost: "Lost to follow-up",
};

const RISK_CLASS: Record<FollowUpRisk, string> = {
  on_track: "bg-[var(--color-on-track-surface)] text-[var(--color-on-track)]",
  at_risk: "bg-[var(--color-due-surface)] text-[var(--color-due)]",
  lost: "bg-[var(--color-overdue-surface)] text-[var(--color-overdue)]",
};

export default async function PatientsPage() {
  const supabase = await createClient();

  const [{ data: patients }, { data: risks }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, name, phone, lmp, status")
      .eq("status", "active")
      .order("name"),
    supabase.from("patient_followup_risk").select("patient_id, risk"),
  ]);

  const riskByPatient = new Map((risks ?? []).map((r) => [r.patient_id, r.risk as FollowUpRisk]));
  const today = todayInClinicTimezone();

  return (
    <div className="p-[var(--space-42)]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[var(--font-heading)] text-[var(--text-heading)] font-light text-[var(--color-primary)]">
          Patients
        </h1>
        <Link
          href="/patients/new"
          className="rounded-[var(--radius-buttons)] bg-[var(--color-primary)] px-[var(--space-21)] py-[var(--space-14)] font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
        >
          New patient
        </Link>
      </div>

      {!patients || patients.length === 0 ? (
        <p className="text-[var(--color-charcoal)]">No active patients yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-cards)] border border-[var(--color-border)]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-sm text-[var(--color-charcoal)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">GA</th>
                <th className="px-4 py-3 font-medium">Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const risk = riskByPatient.get(p.id) ?? "on_track";
                const ga = p.lmp ? formatGA(gestationalAge(parseLocalDate(p.lmp), today)) : "—";
                return (
                  <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/patients/${p.id}`}
                        className="inline-flex min-h-11 items-center font-medium text-[var(--color-primary)] hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-charcoal)]">{p.phone ?? "—"}</td>
                    <td className="px-4 py-3">{ga}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-[var(--radius-badges)] px-[var(--space-9)] py-1 text-sm ${RISK_CLASS[risk]}`}>
                        {RISK_LABEL[risk]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}
