"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Phone, WhatsappLogo, CheckCircle } from "@phosphor-icons/react";
import { Tag, SEVERITY_TONE, type Tone } from "@/components/ui";
import { ContactLogForm } from "@/components/ContactLogForm";
import type { ClinicalFlag } from "@/lib/clinical";
import type { ContactOutcome } from "@/lib/supabase/enums";
import type { ReminderReason } from "@/lib/whatsapp";

export interface CallRow {
  id: string;
  name: string;
  phone: string | null;
  gaLabel: string | null;
  reason: ReminderReason;
  overdueItems: string[];
  overdueDays: number;
  flags: ClinicalFlag[];
  noAnswerStreak: number;
  attempts30d: number;
  lastContact: { outcome: ContactOutcome; channel: string; daysAgo: number } | null;
  tel: string | null;
  whatsapp: string | null;
}

export type CallFilter = "all" | "overdue" | "at_risk" | "lost" | "pending";

const FILTERS: { id: CallFilter; label: string; test: (r: CallRow) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "pending", label: "Not called today", test: (r) => r.lastContact?.daysAgo !== 0 },
  { id: "overdue", label: "Overdue items", test: (r) => r.overdueItems.length > 0 },
  { id: "at_risk", label: "At risk", test: (r) => r.reason === "at_risk" },
  { id: "lost", label: "Lost", test: (r) => r.reason === "lost" },
];

const OUTCOME: Record<ContactOutcome, { label: string; tone: Tone }> = {
  reached: { label: "Reached", tone: "ok" },
  will_visit: { label: "Will visit", tone: "ok" },
  no_answer: { label: "No answer", tone: "warning" },
  wrong_number: { label: "Wrong number", tone: "critical" },
  refused: { label: "Refused", tone: "critical" },
};

function ago(days: number) {
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days}d ago`;
}

export function CallQueue({ rows, initialFilter }: { rows: CallRow[]; initialFilter: CallFilter }) {
  const [filter, setFilter] = useState<CallFilter>(initialFilter);
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, rows.filter(f.test).length])), [rows]);
  const visible = rows.filter(FILTERS.find((f) => f.id === filter)!.test);

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] p-3">
        <div className="flex flex-wrap gap-px bg-[var(--color-border)] p-px" role="tablist" aria-label="Filter queue">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-8 px-2.5 text-[13px] ${
                filter === f.id
                  ? "bg-[var(--color-foreground)] font-medium text-white"
                  : "bg-[var(--color-background)] hover:bg-[var(--color-surface-2)]"
              }`}
            >
              {f.label} <span className="num text-[11px] opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <ol>
        {visible.map((r, i) => {
          const calledToday = r.lastContact?.daysAgo === 0;
          return (
            <li
              key={r.id}
              className={`grid gap-3 border-b border-[var(--color-border)] px-3 py-3 last:border-0 lg:grid-cols-[2rem_minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center ${
                calledToday ? "bg-[var(--color-surface-1)]" : ""
              }`}
            >
              <span className="num hidden text-[12px] text-[var(--color-charcoal)] lg:block">{String(i + 1).padStart(2, "0")}</span>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={`/patients/${r.id}`} className="font-semibold hover:underline">
                    {r.name}
                  </Link>
                  <span className="num text-[12px] text-[var(--color-charcoal)]">
                    {[r.gaLabel, r.phone].filter(Boolean).join(" · ") || "No phone on file"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.reason === "lost" && <Tag tone="critical">Lost to follow-up</Tag>}
                  {r.reason === "at_risk" && (
                    <Tag tone="warning">{r.noAnswerStreak >= 2 ? `Unreachable ×${r.noAnswerStreak}` : "At risk"}</Tag>
                  )}
                  {r.flags.map((f) => (
                    <Tag key={f.code} tone={SEVERITY_TONE[f.severity]}>
                      {f.label}
                    </Tag>
                  ))}
                  {r.overdueItems.length > 0 && (
                    <Tag tone="warning">
                      <span className="num mr-1 text-[12px]">{r.overdueDays}d</span> overdue: {r.overdueItems[0].split("(")[0].trim()}
                      {r.overdueItems.length > 1 ? ` +${r.overdueItems.length - 1}` : ""}
                    </Tag>
                  )}
                </div>
              </div>

              <div className="text-[13px]">
                {r.lastContact ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {calledToday && <CheckCircle size={15} weight="fill" className="text-[var(--color-on-track)]" aria-hidden />}
                    <Tag tone={OUTCOME[r.lastContact.outcome].tone}>{OUTCOME[r.lastContact.outcome].label}</Tag>
                    <span className="text-[var(--color-charcoal)]">
                      {r.lastContact.channel === "whatsapp" ? "WhatsApp" : "Call"} · {ago(r.lastContact.daysAgo)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[var(--color-charcoal)]">Never contacted</span>
                )}
                <p className="num mt-0.5 text-[12px] text-[var(--color-charcoal)]">{r.attempts30d} {r.attempts30d === 1 ? "attempt" : "attempts"} in 30d</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {r.tel && (
                  <a
                    href={r.tel}
                    className="inline-flex min-h-9 items-center gap-1.5 bg-[var(--color-primary)] px-3 text-[13px] font-semibold text-white hover:bg-[var(--color-primary-hover)]"
                  >
                    <Phone size={15} weight="fill" aria-hidden /> Call
                  </a>
                )}
                {r.whatsapp && (
                  <a
                    href={r.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center gap-1.5 border border-[var(--color-border-strong)] px-3 text-[13px] font-medium hover:border-[var(--color-foreground)]"
                  >
                    <WhatsappLogo size={15} aria-hidden /> WhatsApp
                  </a>
                )}
                <ContactLogForm patientId={r.id} />
              </div>
            </li>
          );
        })}
      </ol>
      {visible.length === 0 && (
        <p className="px-3 py-8 text-center text-[13px] text-[var(--color-charcoal)]">
          {rows.length === 0 ? "Nobody needs a follow-up call right now." : "Nothing in this filter."}
        </p>
      )}
    </div>
  );
}
