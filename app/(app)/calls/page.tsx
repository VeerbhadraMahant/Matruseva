import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClinicSnapshot, daysOverdue, followUpPriority } from "@/lib/snapshot";
import { isManualContact, needsFollowUp } from "@/lib/followUp";
import { formatGALocalized } from "@/lib/pregnancy";
import { daysBetween } from "@/lib/format";
import { todayInClinicTimezone, toISODate } from "@/lib/today";
import {
  telLink,
  whatsAppLink,
  allLanguageMessages,
  type ReminderReason,
  type MessageTemplates,
} from "@/lib/whatsapp";
import { getDemoContacts } from "@/lib/demo-data";
import { PageHeader, pageBody } from "@/components/ui";
import { CallQueue, type CallFilter, type CallRow } from "@/components/CallQueue";
import type { ContactOutcome } from "@/lib/supabase/enums";
import { getT } from "@/lib/i18n/server";

const FILTER_IDS: CallFilter[] = ["all", "overdue", "at_risk", "lost", "pending"];

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ f?: string; simulator?: string }> }) {
  const { t } = await getT();
  const me = await getCurrentUser();
  const supabase = me.isDemo ? null : await createClient();

  const [{ f, simulator }, { rows, today }, { data: clinic }] = await Promise.all([
    searchParams,
    getClinicSnapshot(),
    supabase
      ? supabase.from("clinics").select("name, message_templates").eq("id", me.clinicId).single()
      : { data: null },
  ]);

  // Only the queued patients' summaries, chunked: PostgREST caps responses
  // (max-rows) and long .in() lists overflow the URL.
  const followUpIds = rows.filter(needsFollowUp).map((r) => r.id);
  // Today's rows (IST) are fetched separately so "contacted today" sees every
  // contact, not just the latest one the summary keeps.
  const todayStart = `${toISODate(today)}T00:00:00+05:30`;
  const contacts = [];
  const todaysContacts: { patient_id: string; outcome: string }[] = [];
  if (supabase) {
    for (let i = 0; i < followUpIds.length; i += 150) {
      const ids = followUpIds.slice(i, i + 150);
      const [{ data }, { data: todayRows }] = await Promise.all([
        supabase
          .from("patient_contact_summary")
          .select("patient_id, last_outcome, last_channel, last_contact_at, attempts_30d")
          .in("patient_id", ids),
        supabase
          .from("contact_log")
          .select("patient_id, outcome")
          .in("patient_id", ids)
          .gte("created_at", todayStart),
      ]);
      contacts.push(...(data ?? []));
      todaysContacts.push(...(todayRows ?? []));
    }
  }
  const templates = (clinic?.message_templates ?? {}) as MessageTemplates;
  const defaultLang = templates.default_lang ?? "en";

  type ContactSummary = {
    lastContact: { outcome: string; channel: string; createdAt: string } | null;
    attempts30d: number;
    contactedToday: boolean;
  };
  const summaryBy = new Map<string, ContactSummary>();
  if (me.isDemo) {
    // Demo contacts arrive newest first per patient; same rules as the DB path.
    const demoBy = new Map<string, { outcome: string; channel: string; createdAt: string }[]>();
    for (const dc of getDemoContacts()) {
      const list = demoBy.get(dc.patientId) ?? [];
      list.push({ outcome: dc.outcome, channel: dc.channel, createdAt: dc.createdAt });
      demoBy.set(dc.patientId, list);
    }
    for (const [pid, list] of demoBy) {
      const ageOf = (h: { createdAt: string }) => daysBetween(todayInClinicTimezone(new Date(h.createdAt)), today);
      summaryBy.set(pid, {
        lastContact: list[0],
        attempts30d: list.filter((h) => ageOf(h) >= 0 && ageOf(h) <= 30).length,
        contactedToday: list.some((h) => isManualContact(h.outcome) && ageOf(h) === 0),
      });
    }
  }
  const manualToday = new Set(todaysContacts.filter((c) => isManualContact(c.outcome)).map((c) => c.patient_id));
  for (const c of contacts) {
    if (!c.patient_id || !c.last_contact_at) continue;
    summaryBy.set(c.patient_id, {
      lastContact: { outcome: c.last_outcome ?? "", channel: c.last_channel ?? "", createdAt: c.last_contact_at },
      attempts30d: c.attempts_30d ?? 0,
      contactedToday: manualToday.has(c.patient_id),
    });
  }

  const queue: CallRow[] = rows
    .filter(needsFollowUp)
    .sort((a, b) => followUpPriority(a, today) - followUpPriority(b, today))
    .map((r) => {
      const reason: ReminderReason = r.risk === "lost" ? "lost" : r.overdue.length > 0 ? "overdue" : "at_risk";
      const item = r.overdue[0]?.name;
      const messagesByLang = allLanguageMessages(r.name, reason, item, templates, clinic?.name);
      const whatsappByLang = {
        en: r.phone ? whatsAppLink(r.phone, messagesByLang.en) : null,
        hi: r.phone ? whatsAppLink(r.phone, messagesByLang.hi) : null,
        mr: r.phone ? whatsAppLink(r.phone, messagesByLang.mr) : null,
      };
      const summary = summaryBy.get(r.id);
      const last = summary?.lastContact;
      const lastDate = last ? todayInClinicTimezone(new Date(last.createdAt)) : null;
      const lastDaysAgo = lastDate
        ? daysBetween(lastDate, today)
        : null;
      return {
        id: r.id,
        name: r.name,
        phone: r.phone,
        gaLabel: r.ga ? formatGALocalized(r.ga, t) : null,
        reason,
        risk: r.risk,
        overdueItems: r.overdue.map((e) => e.name),
        overdueDays: daysOverdue(r, today),
        flags: r.flags.filter((fl) => fl.severity !== "info"),
        noAnswerStreak: r.noAnswerStreak,
        attempts30d: summary?.attempts30d ?? 0,
        contactedToday: summary?.contactedToday ?? false,
        lastContact: last
          ? { outcome: last.outcome as ContactOutcome, channel: last.channel, daysAgo: lastDaysAgo ?? 0 }
          : null,
        tel: r.phone ? telLink(r.phone) : null,
        whatsapp: whatsappByLang[defaultLang],
        whatsappByLang,
        messagesByLang,
      };
    });

  const initialFilter = FILTER_IDS.includes(f as CallFilter) ? (f as CallFilter) : "all";
  const pending = queue.filter((row) => !row.contactedToday).length;

  return (
    <>
      <PageHeader
        title={t("calls.title")}
        meta={
          <span className="num">
            {t("calls.meta.needFollowUp", { count: queue.length })} · {t("calls.meta.notContacted", { count: pending })}
          </span>
        }
      />
      <div className={pageBody}>
        <CallQueue key={initialFilter} rows={queue} initialFilter={initialFilter} defaultLang={defaultLang} showSimulator={me.isDemo && simulator === "1"} />
      </div>
    </>
  );
}
