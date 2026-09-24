import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gestationalAge, formatGA, trimester } from "@/lib/pregnancy";
import { todayInClinicTimezone } from "@/lib/today";
import { MarkDoneButton } from "@/components/MarkDoneButton";
import { VisitForm } from "@/components/VisitForm";
import type { CareEventStatus } from "@/lib/supabase/enums";

const STATUS_LABEL: Record<CareEventStatus, string> = {
  done: "Done",
  skipped: "Missed",
  upcoming: "Upcoming",
  due: "Due",
  overdue: "Overdue",
};

const STATUS_CLASS: Record<CareEventStatus, string> = {
  done: "bg-[var(--color-on-track-surface)] text-[var(--color-on-track)]",
  skipped: "bg-[var(--color-surface-2)] text-[var(--color-charcoal)]",
  upcoming: "bg-[var(--color-surface-2)] text-[var(--color-charcoal)]",
  due: "bg-[var(--color-due-surface)] text-[var(--color-due)]",
  overdue: "bg-[var(--color-overdue-surface)] text-[var(--color-overdue)]",
};

function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  if (!patient) notFound();

  const [{ data: careEvents }, { data: visits }] = await Promise.all([
    supabase
      .from("care_event_status")
      .select("id, name, kind, due_from, due_to, completed_at, status")
      .eq("patient_id", id)
      .order("due_from"),
    supabase.from("visits").select("*").eq("patient_id", id).order("visit_date", { ascending: false }),
  ]);

  const today = todayInClinicTimezone();
  const ga = patient.lmp ? gestationalAge(parseLocalDate(patient.lmp), today) : null;

  return (
    <div className="p-[var(--space-42)]">
      <div className="mb-8 rounded-[var(--radius-cards)] bg-[var(--color-surface-1)] p-[var(--space-28)]">
        <h1 className="font-[var(--font-heading)] text-[var(--text-heading-sm)] font-light text-[var(--color-primary)]">
          {patient.name}
        </h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--color-charcoal)]">
          {ga && (
            <span>
              {formatGA(ga)} · trimester {trimester(ga)}
            </span>
          )}
          {patient.edd && <span>EDD {formatDate(patient.edd)}</span>}
          {patient.blood_group && <span>{patient.blood_group}</span>}
          {patient.rh_negative && <span>Rh negative</span>}
          {patient.phone && <span>{patient.phone}</span>}
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-[var(--text-subheading)] font-medium">Schedule</h2>
        {!careEvents || careEvents.length === 0 ? (
          <p className="text-sm text-[var(--color-charcoal)]">No schedule generated for this patient.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-cards)] border border-[var(--color-border)]">
            {careEvents.map((ce) => {
              // due_from/due_to/id/status come from a security-invoker view over
              // a NOT NULL base column / a non-null CASE expression; the type
              // generator can't see through the view to prove that, but the DB does.
              const dueFrom = ce.due_from!;
              const dueTo = ce.due_to!;
              const status = ce.status! as CareEventStatus;
              const careEventId = ce.id!;
              return (
                <li key={careEventId} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="font-medium">{ce.name}</p>
                    <p className="text-sm text-[var(--color-charcoal)]">
                      {formatDate(dueFrom)} – {formatDate(dueTo)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-[var(--radius-badges)] px-[var(--space-9)] py-1 text-sm ${STATUS_CLASS[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                    {status !== "done" && <MarkDoneButton careEventId={careEventId} patientId={id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-[var(--text-subheading)] font-medium">Record a visit</h2>
        <VisitForm patientId={id} />
      </section>

      <section>
        <h2 className="mb-4 text-[var(--text-subheading)] font-medium">Visit history</h2>
        {!visits || visits.length === 0 ? (
          <p className="text-sm text-[var(--color-charcoal)]">No visits recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {visits.map((v) => (
              <li key={v.id} className="rounded-[var(--radius-cards)] border border-[var(--color-border)] px-4 py-3 text-sm">
                <p className="font-medium">{formatDate(v.visit_date)}</p>
                <p className="text-[var(--color-charcoal)]">
                  {[
                    v.bp_sys && v.bp_dia ? `BP ${v.bp_sys}/${v.bp_dia}` : null,
                    v.weight ? `${v.weight}kg` : null,
                    v.hb ? `Hb ${v.hb}` : null,
                    v.fhr ? `FHR ${v.fhr}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {v.notes && <p className="mt-1">{v.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
