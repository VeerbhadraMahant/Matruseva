"use client";

import { useMemo, useState, useRef, useTransition } from "react";
import Link from "next/link";
import {
  Phone,
  WhatsappLogo,
  CheckCircle,
  X,
  PhoneCall,
  ArrowsLeftRight,
  Translate,
  Robot,
  CaretDown,
  UsersThree,
  Warning,
} from "@phosphor-icons/react";
import { Tag, SEVERITY_TONE, type Tone, buttonPrimary, buttonSecondary, card, chipClass, chipCountClass } from "@/components/ui";
import { ContactLogForm } from "@/components/ContactLogForm";
import { quickLogContact, logBatchContacts } from "@/app/(app)/calls/actions";
import { WhatsAppBotSimulator } from "@/components/WhatsAppBotSimulator";
import type { ClinicalFlag } from "@/lib/clinical";
import type { ContactOutcome } from "@/lib/supabase/enums";
import {
  SUPPORTED_LANGUAGES,
  type ReminderReason,
  type SupportedLanguage,
} from "@/lib/whatsapp";

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
  whatsappByLang?: Record<SupportedLanguage, string | null>;
  messagesByLang?: Record<SupportedLanguage, string>;
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
  whatsappUrl?: string | null;
  messagesByLang?: Record<SupportedLanguage, string>;
}

export function CallQueue({
  rows,
  initialFilter,
  defaultLang = "en",
}: {
  rows: CallRow[];
  initialFilter: CallFilter;
  defaultLang?: SupportedLanguage;
}) {
  const [filter, setFilter] = useState<CallFilter>(initialFilter);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(defaultLang);
  const [quickLogTarget, setQuickLogTarget] = useState<QuickLogTarget | null>(null);
  const [simulatorPatientId, setSimulatorPatientId] = useState<string | null>(null);
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

  // Batch contact logging state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchOutcome, setBatchOutcome] = useState<ContactOutcome | "automated_reminder">("no_answer");
  const [batchNotes, setBatchNotes] = useState("");
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [batchToast, setBatchToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isBatchPending, startBatchTransition] = useTransition();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (visible.length === 0) return;
    const allSelected = visible.every((r) => selectedIds.has(r.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map((r) => r.id)));
    }
  };

  const getBatchOutcomeLabel = (out: ContactOutcome | "automated_reminder") => {
    if (out === "automated_reminder") return "Automated reminder sent (WhatsApp)";
    return OUTCOME[out as ContactOutcome]?.label ?? out;
  };

  const handleBatchSubmit = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const outcomeToLog: ContactOutcome = batchOutcome === "automated_reminder" ? "reached" : batchOutcome;
    const finalNotes =
      batchOutcome === "automated_reminder"
        ? (batchNotes.trim() ? `Automated reminder sent: ${batchNotes.trim()}` : "Automated WhatsApp reminder sent")
        : (batchNotes.trim() || undefined);

    startBatchTransition(async () => {
      const res = await logBatchContacts(ids, outcomeToLog, finalNotes);
      setShowBatchConfirm(false);
      if (res.error) {
        setBatchToast({ message: res.error, type: "error" });
      } else {
        const skippedMsg = res.skippedCount > 0 ? ` (${res.skippedCount} skipped as closed/delivered)` : "";
        setBatchToast({
          message: `Logged ${res.loggedCount} contact${res.loggedCount === 1 ? "" : "s"}${skippedMsg}`,
          type: "success",
        });
        setSelectedIds(new Set());
        setBatchNotes("");
        setTimeout(() => setBatchToast(null), 4000);
      }
    });
  };

  return (
    <>
      <div className={`overflow-hidden ${card}`}>
        {/* Filter and Language Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] p-4">
          {/* Worklist Filter Tabs */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:px-0" role="tablist" aria-label="Filter queue">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={chipClass(filter === f.id)}
              >
                {f.label} <span className={chipCountClass(filter === f.id)}>{counts[f.id]}</span>
              </button>
            ))}
          </div>

          {/* Action Tools: WhatsApp Bot Simulator & Language Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSimulatorPatientId(visible[0]?.id || rows[0]?.id || null)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3.5 text-[13px] font-medium text-[var(--color-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              title="Open WhatsApp Business Bot Simulator to test 2-way patient conversations"
            >
              <Robot size={15} weight="bold" />
              <span>WhatsApp bot</span>
            </button>

            {/* WhatsApp Language Switcher */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-charcoal)]">
                <Translate size={14} className="text-[var(--color-primary)]" />
                <span>Language:</span>
              </span>
              <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] p-1">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    aria-pressed={selectedLang === l.code}
                    onClick={() => setSelectedLang(l.code)}
                    className={`min-h-8 rounded-full px-3 text-[13px] font-medium transition-colors ${
                      selectedLang === l.code
                        ? "bg-[var(--color-primary)] text-white font-semibold"
                        : "text-[var(--color-foreground)] hover:bg-[var(--color-background)]"
                    }`}
                  >
                    {l.nativeLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Gestures Hint */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-[var(--color-surface-1)] border-b border-[var(--color-border)] text-[12px] text-[var(--color-charcoal)]">
          <span className="flex items-center gap-1.5">
            <ArrowsLeftRight size={13} aria-hidden />
            <span>Swipe: Right for Call · Left for WhatsApp</span>
          </span>
          <span className="font-medium text-[var(--color-foreground)]">
            WA: {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel}
          </span>
        </div>

        {/* Batch Feedback Toast */}
        {batchToast && (
          <div
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-semibold ${
              batchToast.type === "success"
                ? "bg-[var(--color-on-track-surface)] border-b border-[var(--color-on-track)] text-[var(--color-on-track)]"
                : "bg-[var(--color-overdue-surface)] border-b border-[var(--color-overdue)] text-[var(--color-overdue)]"
            }`}
          >
            <div className="flex items-center gap-2">
              {batchToast.type === "success" ? (
                <CheckCircle size={16} weight="fill" />
              ) : (
                <Warning size={16} weight="fill" />
              )}
              <span>{batchToast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setBatchToast(null)}
              className="text-xs opacity-75 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Batch Selection Header Toolbar */}
        {visible.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface-1)] border-b border-[var(--color-border)] text-[13px] text-[var(--color-charcoal)]">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--color-foreground)] select-none">
              <input
                type="checkbox"
                checked={visible.length > 0 && visible.every((r) => selectedIds.has(r.id))}
                onChange={toggleSelectAll}
                ref={(el) => {
                  if (el) {
                    const someSelected = visible.some((r) => selectedIds.has(r.id));
                    const allSelected = visible.every((r) => selectedIds.has(r.id));
                    el.indeterminate = someSelected && !allSelected;
                  }
                }}
                className="h-4 w-4 accent-[var(--color-primary)] rounded cursor-pointer"
                aria-label="Select all patients in this list"
              />
              <span>Select all in queue ({visible.length})</span>
            </label>

            {selectedIds.size > 0 && (
              <span className="font-semibold text-[var(--color-primary)]">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        )}

        <ol>
          {visible.map((r, i) => {
            const currentWaLink = r.whatsappByLang?.[selectedLang] ?? r.whatsapp;
            return (
              <SwipeableCallCard
                key={r.id}
                row={r}
                index={i}
                selectedLang={selectedLang}
                waLink={currentWaLink}
                isSelected={selectedIds.has(r.id)}
                onToggleSelect={() => toggleSelect(r.id)}
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
                  if (currentWaLink) window.open(currentWaLink, "_blank");
                  setQuickLogTarget({
                    patientId: r.id,
                    name: r.name,
                    phone: r.phone,
                    channel: "whatsapp",
                    whatsappUrl: currentWaLink,
                    messagesByLang: r.messagesByLang,
                  });
                }}
                onTriggerBot={() => setSimulatorPatientId(r.id)}
              />
            );
          })}
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
          <div className="rounded-2xl w-full max-w-lg border border-[var(--color-border-strong)] bg-[var(--color-background)] p-4 shadow-2xl animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                {quickLogTarget.channel === "call" ? (
                  <PhoneCall size={20} className="text-[var(--color-primary)]" weight="fill" />
                ) : (
                  <WhatsappLogo size={20} className="text-[#25D366]" weight="fill" />
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

            {/* If WhatsApp, show language used and message preview */}
            {quickLogTarget.channel === "whatsapp" && quickLogTarget.messagesByLang && (
              <div className="rounded-xl my-3 p-2.5 bg-[var(--color-surface-1)] border border-[var(--color-border)] text-[12px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-[var(--color-charcoal)]">
                    WhatsApp Message Preview:
                  </span>
                  <div className="inline-flex gap-1">
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setSelectedLang(l.code)}
                        className={`px-1.5 py-0.5 text-[10px] font-medium border ${
                          selectedLang === l.code
                            ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                            : "bg-white text-[var(--color-charcoal)] border-[var(--color-border)] hover:border-black"
                        }`}
                      >
                        {l.nativeLabel}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[12px] italic text-[var(--color-foreground)] leading-relaxed">
                  &ldquo;{quickLogTarget.messagesByLang[selectedLang]}&rdquo;
                </p>
              </div>
            )}

            {logStatusMessage ? (
              <div className="py-6 text-center text-[14px] font-semibold text-[var(--color-on-track)] flex items-center justify-center gap-2">
                <CheckCircle size={20} weight="fill" />
                {logStatusMessage}
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-[12px] font-medium text-[var(--color-charcoal)]">
                  Select Contact Outcome:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("will_visit", "Patient confirmed visit")}
                    className="rounded-xl flex items-center justify-between p-2.5 text-left border border-[var(--color-on-track)] bg-[var(--color-on-track-surface)] text-[var(--color-on-track)] hover:opacity-90 font-medium text-[13px]"
                  >
                    <span>✓ Will visit / Scheduled</span>
                    <span className="text-[11px] opacity-75">Coming in</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("reached", "Spoke with patient")}
                    className="rounded-xl flex items-center justify-between p-2.5 text-left border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] text-[var(--color-foreground)] font-medium text-[13px]"
                  >
                    <span>Reached / Informed</span>
                    <span className="text-[11px] text-[var(--color-charcoal)]">Spoke</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("no_answer", "Ringing, no response")}
                    className="rounded-xl flex items-center justify-between p-2.5 text-left border border-[var(--color-due)] bg-[var(--color-due-surface)] text-[var(--color-due)] hover:opacity-90 font-medium text-[13px]"
                  >
                    <span>⚠ No answer / Busy</span>
                    <span className="text-[11px] opacity-75">Unanswered</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("wrong_number", "Wrong number or switched off")}
                    className="rounded-xl flex items-center justify-between p-2.5 text-left border border-[var(--color-overdue)] bg-[var(--color-overdue-surface)] text-[var(--color-overdue)] hover:opacity-90 font-medium text-[13px]"
                  >
                    <span>✕ Wrong number / Out of service</span>
                    <span className="text-[11px] opacity-75">Invalid</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("refused", "Patient declined follow-up")}
                    className="rounded-xl sm:col-span-2 flex items-center justify-between p-2 text-left border border-[var(--color-border)] text-[var(--color-charcoal)] hover:bg-[var(--color-surface-1)] text-[12px]"
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
      {/* WhatsApp Business Bot Simulator Modal */}
      {simulatorPatientId && (
        <WhatsAppBotSimulator
          patients={rows.map((r) => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
            careEventName: r.overdueItems[0] || undefined,
            reason: r.reason,
          }))}
          initialPatientId={simulatorPatientId}
          initialLang={selectedLang}
          onClose={() => setSimulatorPatientId(null)}
        />
      )}
      {/* Sticky Batch Contact Action Bar */}
      {selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Batch contact actions"
          className="sticky bottom-0 z-40 border-t-2 border-[var(--color-primary)] bg-[var(--color-background)] p-3 shadow-2xl animate-in slide-in-from-bottom duration-200"
        >
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[var(--color-primary)] text-white text-xs font-bold px-2.5 py-1">
                <UsersThree size={16} weight="bold" />
                <span>{selectedIds.size} selected</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-[var(--color-charcoal)] hover:text-[var(--color-foreground)] underline cursor-pointer"
              >
                Clear selection
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
              <div className="flex items-center gap-1.5">
                <label htmlFor="batch-outcome" className="text-xs font-semibold text-[var(--color-charcoal)]">
                  Outcome:
                </label>
                <select
                  id="batch-outcome"
                  value={batchOutcome}
                  onChange={(e) => setBatchOutcome(e.target.value as ContactOutcome | "automated_reminder")}
                  className="rounded-xl min-h-9 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  <option value="no_answer">No answer / Ringing</option>
                  <option value="reached">Reached / Informed</option>
                  <option value="will_visit">Will visit / Scheduled</option>
                  <option value="wrong_number">Wrong number / Invalid</option>
                  <option value="refused">Refused care</option>
                  <option value="automated_reminder">Automated reminder sent (WhatsApp)</option>
                </select>
              </div>

              <input
                type="text"
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                placeholder="Optional notes for selected..."
                className="rounded-xl min-h-9 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 text-xs max-w-xs focus:ring-1 focus:ring-[var(--color-primary)]"
              />

              <button
                type="button"
                onClick={() => setShowBatchConfirm(true)}
                disabled={isBatchPending}
                className={buttonPrimary}
              >
                <span>Log for {selectedIds.size} selected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Confirmation Modal */}
      {showBatchConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="rounded-2xl w-full max-w-md border border-[var(--color-border-strong)] bg-[var(--color-background)] p-5 shadow-2xl space-y-3">
            <h3 id="batch-confirm-title" className="text-[15px] font-bold text-[var(--color-foreground)]">
              Confirm Batch Contact Logging
            </h3>
            <p className="text-xs text-[var(--color-charcoal)] leading-relaxed">
              Log outcome <strong>&quot;{getBatchOutcomeLabel(batchOutcome)}&quot;</strong> for all{" "}
              <strong>{selectedIds.size}</strong> selected patient(s)?
            </p>
            <p className="text-[11px] text-[var(--color-charcoal)]">
              Closed or delivered pregnancies will be automatically skipped.
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-3">
              <button
                type="button"
                onClick={() => setShowBatchConfirm(false)}
                disabled={isBatchPending}
                className={buttonSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchSubmit}
                disabled={isBatchPending}
                className={buttonPrimary}
              >
                {isBatchPending ? "Logging..." : "Yes, Log Contacts"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================================
   Swipeable Call Card Sub-component with Language-aware WhatsApp
   ========================================================================= */

function SwipeableCallCard({
  row: r,
  index: i,
  selectedLang,
  waLink,
  isSelected,
  onToggleSelect,
  onTriggerCall,
  onTriggerWhatsApp,
  onTriggerBot,
}: {
  row: CallRow;
  index: number;
  selectedLang: SupportedLanguage;
  waLink: string | null;
  isSelected: boolean;
  onToggleSelect: () => void;
  onTriggerCall: () => void;
  onTriggerWhatsApp: () => void;
  onTriggerBot?: () => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [showLog, setShowLog] = useState(false);
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
          {offsetX < -60 && (
            <span className="whitespace-nowrap font-medium">
              WA ({SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel})
            </span>
          )}
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
        className={`relative z-1 bg-[var(--color-background)] grid gap-3 px-4 py-4 grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[1.5rem_2rem_minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center ${
          calledToday ? "bg-[var(--color-surface-1)]" : ""
        } ${isSelected ? "ring-1 ring-[var(--color-primary)] bg-[var(--color-surface-1)]" : ""}`}
      >
        <div className="flex items-center">
          <input
            type="checkbox"
            id={`chk-${r.id}`}
            checked={isSelected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-[var(--color-border-strong)] accent-[var(--color-primary)] cursor-pointer"
            aria-label={`Select ${r.name} for batch contact logging`}
          />
        </div>

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

        <div className="col-start-2 text-[13px] lg:col-start-auto">
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

        <div className="col-start-2 flex flex-wrap items-center gap-2 lg:col-start-auto">
          {r.tel && (
            <button
              type="button"
              onClick={onTriggerCall}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] cursor-pointer"
            >
              <Phone size={15} weight="fill" aria-hidden /> Call
            </button>
          )}
          {waLink && (
            <button
              type="button"
              onClick={onTriggerWhatsApp}
              className="rounded-xl inline-flex min-h-10 items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-[13px] font-medium transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer"
              title={`Send WhatsApp reminder in ${SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel}`}
            >
              <WhatsappLogo size={15} aria-hidden />
              <span>WhatsApp</span>
            </button>
          )}
          {onTriggerBot && (
            <button
              type="button"
              onClick={onTriggerBot}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-[var(--color-charcoal)] transition-colors hover:bg-[var(--color-primary-surface)] hover:text-[var(--color-primary)] cursor-pointer"
              title="Test 2-way automated WhatsApp Bot for this patient"
              aria-label={`Open WhatsApp bot simulator for ${r.name}`}
            >
              <Robot size={18} aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowLog((v) => !v)}
            aria-expanded={showLog}
            className="hidden min-h-10 items-center gap-1 rounded-xl px-2.5 text-[13px] font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-surface)] sm:inline-flex"
          >
            Log outcome
            <CaretDown size={13} aria-hidden className={`transition-transform ${showLog ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {showLog && (
        <div className="relative z-1 hidden justify-end border-t border-dashed border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3 sm:flex">
          <ContactLogForm patientId={r.id} />
        </div>
      )}
    </li>
  );
}
