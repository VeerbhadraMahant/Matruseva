import Link from "next/link";
import { Phone, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { telLink, whatsAppLink, defaultReminderMessage, type ReminderReason } from "@/lib/whatsapp";
import { ContactLogForm } from "@/components/ContactLogForm";
import type { FollowUpRisk } from "@/lib/supabase/enums";

interface QueueRow {
  patientId: string;
  name: string;
  phone: string | null;
  reason: ReminderReason;
  careEventName?: string;
}

const REASON_LABEL: Record<ReminderReason, string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  at_risk: "At risk",
  lost: "Lost to follow-up",
};

export default async function CallsPage() {
  const supabase = await createClient();

  const [{ data: overdueEvents }, { data: risks }] = await Promise.all([
    supabase
      .from("care_event_status")
      .select("patient_id, name, due_to")
      .eq("status", "overdue")
      .order("due_to"),
    supabase.from("patient_followup_risk").select("patient_id, risk").in("risk", ["at_risk", "lost"]),
  ]);

  const overdueByPatient = new Map<string, string>();
  for (const e of overdueEvents ?? []) {
    if (!e.patient_id || !e.name) continue;
    if (!overdueByPatient.has(e.patient_id)) overdueByPatient.set(e.patient_id, e.name);
  }
  const riskByPatient = new Map(
    (risks ?? [])
      .filter((r): r is typeof r & { patient_id: string } => r.patient_id !== null)
      .map((r) => [r.patient_id, r.risk as FollowUpRisk])
  );

  const patientIds = new Set<string>([...overdueByPatient.keys(), ...riskByPatient.keys()]);

  const { data: patients } = patientIds.size
    ? await supabase.from("patients").select("id, name, phone").in("id", Array.from(patientIds))
    : { data: [] };

  const queue: QueueRow[] = (patients ?? []).map((p) => {
    const overdueEventName = overdueByPatient.get(p.id);
    const risk = riskByPatient.get(p.id);
    const reason: ReminderReason = overdueEventName ? "overdue" : risk === "lost" ? "lost" : "at_risk";
    return { patientId: p.id, name: p.name, phone: p.phone, reason, careEventName: overdueEventName };
  });

  return (
    <div className="p-[var(--space-42)]">
      <h1 className="mb-1 font-[var(--font-heading)] text-[var(--text-heading)] font-light text-[var(--color-primary)]">
        Calls
      </h1>
      <p className="mb-8 text-sm text-[var(--color-charcoal)]">
        {queue.length} {queue.length === 1 ? "patient needs" : "patients need"} follow-up
      </p>

      {queue.length === 0 ? (
        <p className="text-[var(--color-charcoal)]">Nobody needs a follow-up call right now.</p>
      ) : (
        <ul className="space-y-3">
          {queue.map((row) => {
            const message = defaultReminderMessage(row.name, row.reason, row.careEventName);
            const tel = row.phone ? telLink(row.phone) : null;
            const wa = row.phone ? whatsAppLink(row.phone, message) : null;

            return (
              <li key={row.patientId} className="rounded-[var(--radius-cards)] border border-[var(--color-border)] p-[var(--space-21)]">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/patients/${row.patientId}`} className="font-medium text-[var(--color-primary)] hover:underline">
                      {row.name}
                    </Link>
                    <p className="text-sm text-[var(--color-charcoal)]">
                      {REASON_LABEL[row.reason]}
                      {row.careEventName ? `: ${row.careEventName}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {tel && (
                      <a
                        href={tel}
                        className="flex items-center gap-1 rounded-[var(--radius-buttons)] border border-[var(--color-primary)] px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)]"
                      >
                        <Phone size={16} weight="regular" aria-hidden /> Call
                      </a>
                    )}
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-[var(--radius-buttons)] border border-[var(--color-primary)] px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)]"
                      >
                        <WhatsappLogo size={16} weight="regular" aria-hidden /> WhatsApp
                      </a>
                    )}
                    {!row.phone && <span className="text-sm text-[var(--color-overdue)]">No phone on file</span>}
                  </div>
                </div>
                <ContactLogForm patientId={row.patientId} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
