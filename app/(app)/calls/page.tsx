import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClinicSnapshot, daysOverdue, needsFollowUp, followUpPriority } from "@/lib/snapshot";
import { formatGA } from "@/lib/pregnancy";
import { daysBetween, parseLocalDate } from "@/lib/format";
import { telLink, whatsAppLink, reminderMessage, type ReminderReason, type MessageTemplates } from "@/lib/whatsapp";
import { PageHeader } from "@/components/ui";
import { CallQueue, type CallFilter, type CallRow } from "@/components/CallQueue";
import type { ContactOutcome } from "@/lib/supabase/enums";

const FILTER_IDS: CallFilter[] = ["all", "overdue", "at_risk", "lost", "pending"];

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const me = await getCurrentUser();
  const supabase = await createClient();

  const [{ f }, { rows, today }, { data: clinic }, { data: contacts }] = await Promise.all([
    searchParams,
    getClinicSnapshot(),
    supabase.from("clinics").select("message_templates").eq("id", me.clinicId).single(),
    supabase
      .from("contact_log")
      .select("patient_id, outcome, channel, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  const templates = (clinic?.message_templates ?? {}) as MessageTemplates;

  const contactsBy = new Map<string, { outcome: string; channel: string; createdAt: string }[]>();
  for (const c of contacts ?? []) {
    const list = contactsBy.get(c.patient_id) ?? [];
    list.push({ outcome: c.outcome, channel: c.channel, createdAt: c.created_at });
    contactsBy.set(c.patient_id, list);
  }

  const queue: CallRow[] = rows
    .filter(needsFollowUp)
    .sort((a, b) => followUpPriority(a, today) - followUpPriority(b, today))
    .map((r) => {
      const reason: ReminderReason = r.risk === "lost" ? "lost" : r.overdue.length > 0 ? "overdue" : "at_risk";
      const item = r.overdue[0]?.name;
      const message = reminderMessage(r.name, reason, item, templates);
      const history = contactsBy.get(r.id) ?? [];
      const last = history[0];
      const lastDate = last ? new Date(last.createdAt) : null;
      const lastDaysAgo = lastDate
        ? daysBetween(parseLocalDate(lastDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })), today)
        : null;
      return {
        id: r.id,
        name: r.name,
        phone: r.phone,
        gaLabel: r.ga ? formatGA(r.ga) : null,
        reason,
        overdueItems: r.overdue.map((e) => e.name),
        overdueDays: daysOverdue(r, today),
        flags: r.flags.filter((fl) => fl.severity !== "info"),
        noAnswerStreak: r.noAnswerStreak,
        attempts30d: history.filter((h) => daysBetween(new Date(h.createdAt), today) <= 30).length,
        lastContact: last
          ? { outcome: last.outcome as ContactOutcome, channel: last.channel, daysAgo: lastDaysAgo ?? 0 }
          : null,
        tel: r.phone ? telLink(r.phone) : null,
        whatsapp: r.phone ? whatsAppLink(r.phone, message) : null,
      };
    });

  const initialFilter = FILTER_IDS.includes(f as CallFilter) ? (f as CallFilter) : "all";
  const pending = queue.filter((q) => q.lastContact?.daysAgo !== 0).length;

  return (
    <>
      <PageHeader
        title="Call queue"
        meta={
          <>
            <span className="num">{queue.length}</span> need follow-up · <span className="num">{pending}</span> not yet contacted today
          </>
        }
      />
      <div className="p-4 md:p-6">
        <CallQueue rows={queue} initialFilter={initialFilter} />
      </div>
    </>
  );
}
