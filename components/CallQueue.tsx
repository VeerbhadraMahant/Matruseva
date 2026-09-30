"use client";

import { useMemo, useState, useRef, useTransition } from "react";
import Link from "next/link";
import {
  Phone,
  WhatsappLogo,
  CheckCircle,
  X,
  PhoneCall,
  ChatCircleText,
  Clock,
  ArrowsLeftRight,
} from "@phosphor-icons/react";
import { Tag, SEVERITY_TONE, type Tone } from "@/components/ui";
import { ContactLogForm } from "@/components/ContactLogForm";
import { quickLogContact } from "@/app/(app)/calls/actions";
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

interface QuickLogTarget {
  patientId: string;
  name: string;
  phone: string | null;
  channel: "call" | "whatsapp";
}

export function CallQueue({ rows, initialFilter }: { rows: CallRow[]; initialFilter: CallFilter }) {
  const [filter, setFilter] = useState<CallFilter>(initialFilter);
  const [quickLogTarget, setQuickLogTarget] = useState<QuickLogTarget | null>(null);
  const [isPending, startTransition] = useTransition();
  const [logStatusMessage, setLogStatusMessage] = useState<string | null>(null);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, rows.filter(f.test).length])), [rows]);
  const visible = rows.filter(FILTERS.find((f) => f.id === filter)!.test);

  const handleQuickSubmit = (outcome: ContactOutcome, notes?: string) => {
    if (!quickLogTarget) return;
    const target = quickLogTarget;
    startTransition(async () => {
      const res = await quickLogContact(target.patientId, target.channel, outcome, notes);
      if (res.error) {
        setLogStatusMessage(`Error: ${res.error}`);
      } else {
        setLogStatusMessage(`Logged: ${OUTCOME[outcome].label}`);
        setTimeout(() => {
          setQuickLogTarget(null);
          setLogStatusMessage(null);
        }, 600);
      }
    });
  };

  return (
    <>
      <div className="border border-[var(--color-border)] bg-[var(--color-background)]">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] p-3">
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

          {/* Mobile Gestures Hint */}
          <div className="lg:hidden flex items-center gap-1.5 text-[11px] text-[var(--color-charcoal)]">
            <ArrowsLeftRight size={14} aria-hidden />
            <span>Swipe card: Right for Call · Left for WhatsApp</span>
          </div>
        </div>

        <ol>
          {visible.map((r, i) => (
            <SwipeableCallCard
              key={r.id}
              row={r}
              index={i}
              onTriggerCall={() => {
                if (r.tel) window.location.href = r.tel;
                setQuickLogTarget({
                  patientId: r.id,
                  name: r.name,
                  phone: r.phone,
                  channel: "call",
                });
              }}
              onTriggerWhatsApp={() => {
                if (r.whatsapp) window.open(r.whatsapp, "_blank");
                setQuickLogTarget({
                  patientId: r.id,
                  name: r.name,
                  phone: r.phone,
                  channel: "whatsapp",
                });
              }}
            />
          ))}
        </ol>

        {visible.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-[var(--color-charcoal)]">
            {rows.length === 0 ? "Nobody needs a follow-up call right now." : "Nothing in this filter."}
          </p>
        )}
      </div>

      {/* Quick-Log Bottom Sheet / Dialog */}
      {quickLogTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg border border-[var(--color-border-strong)] bg-[var(--color-background)] p-4 shadow-2xl animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                {quickLogTarget.channel === "call" ? (
                  <PhoneCall size={20} className="text-[var(--color-primary)]" weight="fill" />
                ) : (
                  <WhatsappLogo size={20} className="text-[var(--color-on-track)]" weight="fill" />
                )}
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--color-foreground)]">
                    Log {quickLogTarget.channel === "call" ? "Call" : "WhatsApp"} with {quickLogTarget.name}
                  </h3>
                  <p className="num text-[12px] text-[var(--color-charcoal)]">
                    {quickLogTarget.phone ?? "No phone recorded"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickLogTarget(null)}
                className="flex h-8 w-8 items-center justify-center text-[var(--color-charcoal)] hover:text-[var(--color-foreground)]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {logStatusMessage ? (
              <div className="py-6 text-center text-[14px] font-semibold text-[var(--color-on-track)] flex items-center justify-center gap-2">
                <CheckCircle size={20} weight="fill" />
                {logStatusMessage}
              </div>
            ) : (
              <div className="space-y-3 pt-3">
                <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
                  Select Contact Outcome:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("will_visit", "Patient confirmed visit")}
                    className="flex items-center justify-between p-2.5 text-left border border-[var(--color-on-track)] bg-[var(--color-on-track-surface)] text-[var(--color-on-track)] hover:opacity-90 font-medium text-[13px]"
                  >
                    <span>✓ Will visit / Scheduled</span>
                    <span className="text-[11px] opacity-75">Coming in</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("reached", "Spoke with patient")}
                    className="flex items-center justify-between p-2.5 text-left border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] text-[var(--color-foreground)] font-medium text-[13px]"
                  >
                    <span>Reached / Informed</span>
                    <span className="text-[11px] text-[var(--color-charcoal)]">Spoke</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("no_answer", "Ringing, no response")}
                    className="flex items-center justify-between p-2.5 text-left border border-[var(--color-due)] bg-[var(--color-due-surface)] text-[var(--color-due)] hover:opacity-90 font-medium text-[13px]"
                  >
                    <span>⚠ No answer / Busy</span>
                    <span className="text-[11px] opacity-75">Unanswered</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("wrong_number", "Wrong number or switched off")}
                    className="flex items-center justify-between p-2.5 text-left border border-[var(--color-overdue)] bg-[var(--color-overdue-surface)] text-[var(--color-overdue)] hover:opacity-90 font-medium text-[13px]"
                  >
                    <span>✕ Wrong number / Out of service</span>
                    <span className="text-[11px] opacity-75">Invalid</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("refused", "Patient declined follow-up")}
                    className="sm:col-span-2 flex items-center justify-between p-2 text-left border border-[var(--color-border)] text-[var(--color-charcoal)] hover:bg-[var(--color-surface-1)] text-[12px]"
                  >
                    <span>Refused care / Shifted elsewhere</span>
                    <span className="text-[11px]">Closed</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================================
   Swipeable Call Card Sub-component
   ========================================================================= */

function SwipeableCallCard({
  row: r,
  index: i,
  onTriggerCall,
  onTriggerWhatsApp,
}: {
  row: CallRow;
  index: number;
  onTriggerCall: () => void;
  onTriggerWhatsApp: () => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const calledToday = r.lastContact?.daysAgo === 0;

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;
    // Damping resistance beyond 120px
    if (Math.abs(diff) < 140) {
      setOffsetX(diff);
    }
  };

  const onTouchEnd = () => {
    const diff = currentXRef.current - startXRef.current;
    setSwiping(false);
    setOffsetX(0);

    // Right swipe threshold: Call
    if (diff > 65) {
      onTriggerCall();
    }
    // Left swipe threshold: WhatsApp
    else if (diff < -65) {
      onTriggerWhatsApp();
    }
  };

  return (
    <li className="relative border-b border-[var(--color-border)] overflow-hidden last:border-0">
      {/* Background Action Reveal Panels during Swipe */}
      <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-4 text-white text-[13px] font-semibold">
        {/* Left reveal: Swipe right for Call */}
        <div
          className={`flex items-center gap-2 h-full absolute inset-y-0 left-0 px-4 bg-[var(--color-primary)] transition-opacity ${
            offsetX > 20 ? "opacity-100" : "opacity-0"
          }`}
          style={{ width: `${Math.max(0, offsetX)}px` }}
        >
          <Phone size={18} weight="fill" className="shrink-0" />
          {offsetX > 60 && <span className="whitespace-nowrap">Call & Log</span>}
        </div>

        {/* Right reveal: Swipe left for WhatsApp */}
        <div
          className={`flex items-center justify-end gap-2 h-full absolute inset-y-0 right-0 px-4 bg-[#25D366] text-black transition-opacity ${
            offsetX < -20 ? "opacity-100" : "opacity-0"
          }`}
          style={{ width: `${Math.max(0, -offsetX)}px` }}
        >
          {offsetX < -60 && <span className="whitespace-nowrap">WhatsApp</span>}
          <WhatsappLogo size={18} weight="fill" className="shrink-0" />
        </div>
      </div>

      {/* Swipeable Card Content */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 0.2s ease-out",
        }}
        className={`relative z-1 bg-[var(--color-background)] grid gap-3 px-3 py-3 lg:grid-cols-[2rem_minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center ${
          calledToday ? "bg-[var(--color-surface-1)]" : ""
        }`}
      >
        <span className="num hidden text-[12px] text-[var(--color-charcoal)] lg:block">
          {String(i + 1).padStart(2, "0")}
        </span>

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
                <span className="num mr-1 text-[12px]">{r.overdueDays}d</span> overdue:{" "}
                {r.overdueItems[0].split("(")[0].trim()}
                {r.overdueItems.length > 1 ? ` +${r.overdueItems.length - 1}` : ""}
              </Tag>
            )}
          </div>
        </div>

        <div className="text-[13px]">
          {r.lastContact ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {calledToday && (
                <CheckCircle size={15} weight="fill" className="text-[var(--color-on-track)]" aria-hidden />
              )}
              <Tag tone={OUTCOME[r.lastContact.outcome].tone}>{OUTCOME[r.lastContact.outcome].label}</Tag>
              <span className="text-[var(--color-charcoal)]">
                {r.lastContact.channel === "whatsapp" ? "WhatsApp" : "Call"} · {ago(r.lastContact.daysAgo)}
              </span>
            </div>
          ) : (
            <span className="text-[var(--color-charcoal)]">Never contacted</span>
          )}
          <p className="num mt-0.5 text-[12px] text-[var(--color-charcoal)]">
            {r.attempts30d} {r.attempts30d === 1 ? "attempt" : "attempts"} in 30d
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {r.tel && (
            <button
              type="button"
              onClick={onTriggerCall}
              className="inline-flex min-h-9 items-center gap-1.5 bg-[var(--color-primary)] px-3 text-[13px] font-semibold text-white hover:bg-[var(--color-primary-hover)] cursor-pointer"
            >
              <Phone size={15} weight="fill" aria-hidden /> Call
            </button>
          )}
          {r.whatsapp && (
            <button
              type="button"
              onClick={onTriggerWhatsApp}
              className="inline-flex min-h-9 items-center gap-1.5 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[13px] font-medium hover:border-[var(--color-foreground)] cursor-pointer"
            >
              <WhatsappLogo size={15} aria-hidden /> WhatsApp
            </button>
          )}
          <div className="hidden sm:block">
            <ContactLogForm patientId={r.id} />
          </div>
        </div>
      </div>
    </li>
  );
}
