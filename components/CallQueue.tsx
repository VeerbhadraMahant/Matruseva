"use client";

import { hasOverdueItems, isAtRisk, isLost } from "@/lib/followUp";

import { memo, useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Phone,
  WhatsappLogo,
  CheckCircle,
  X,
  PhoneCall,
  Translate,
  Robot,
  CaretDown,
  UsersThree,
  Warning,
} from "@phosphor-icons/react";
import { Tag, StatusDot, SEVERITY_TONE, type Tone, buttonPrimary, buttonSecondary, buttonGhost, card, chipClass, chipCountClass } from "@/components/ui";
import { ContactLogForm } from "@/components/ContactLogForm";
import { logBatchContacts } from "@/app/(app)/calls/actions";
import { submitQuickContact } from "@/components/offlineActions";
import { PAGE_SIZE, nextLimit, remainingCount } from "@/lib/paging";
import type { ClinicalFlag } from "@/lib/clinical";
import type { ContactOutcome, ManualContactOutcome, FollowUpRisk } from "@/lib/supabase/enums";
import { useT } from "@/lib/i18n/provider";
import type { Translator } from "@/lib/i18n/translate-client";
import { careEventName } from "@/lib/clinicalLabels";
import { flagLabel } from "@/lib/clinical";
import {
  SUPPORTED_LANGUAGES,
  type ReminderReason,
  type SupportedLanguage,
} from "@/lib/whatsapp";

// Rarely used modal: loaded only when a simulator is opened.
const WhatsAppBotSimulator = dynamic(
  () => import("@/components/WhatsAppBotSimulator").then((m) => m.WhatsAppBotSimulator),
  { ssr: false },
);

export interface CallRow {
  id: string;
  name: string;
  phone: string | null;
  gaLabel: string | null;
  reason: ReminderReason;
  risk: FollowUpRisk;
  overdueItems: string[];
  overdueDays: number;
  flags: ClinicalFlag[];
  noAnswerStreak: number;
  attempts30d: number;
  contactedToday: boolean;
  lastContact: { outcome: ContactOutcome; channel: string; daysAgo: number } | null;
  tel: string | null;
  whatsapp: string | null;
  whatsappByLang?: Record<SupportedLanguage, string | null>;
  messagesByLang?: Record<SupportedLanguage, string>;
}

export type CallFilter = "all" | "overdue" | "at_risk" | "lost" | "pending";

type MsgKey = Parameters<Translator>[0];

const FILTERS: { id: CallFilter; labelKey: MsgKey; test: (r: CallRow) => boolean }[] = [
  { id: "all", labelKey: "calls.filter.all", test: () => true },
  { id: "pending", labelKey: "calls.filter.pending", test: (r) => !r.contactedToday },
  { id: "overdue", labelKey: "calls.filter.overdue", test: (r) => hasOverdueItems(r.overdueItems.length) },
  { id: "at_risk", labelKey: "calls.filter.atRisk", test: (r) => isAtRisk(r.risk) },
  { id: "lost", labelKey: "calls.filter.lost", test: (r) => isLost(r.risk) },
];

const OUTCOME: Record<ContactOutcome, { labelKey: MsgKey; tone: Tone }> = {
  reached: { labelKey: "calls.outcome.reached", tone: "ok" },
  will_visit: { labelKey: "calls.outcome.willVisit", tone: "ok" },
  no_answer: { labelKey: "calls.outcome.noAnswer", tone: "warning" },
  wrong_number: { labelKey: "calls.outcome.wrongNumber", tone: "critical" },
  refused: { labelKey: "calls.outcome.refused", tone: "critical" },
  automated_reminder: { labelKey: "calls.batch.opt.automated", tone: "neutral" },
};

function ago(t: Translator, days: number) {
  return days === 0 ? t("calls.ago.today") : days === 1 ? t("calls.ago.yesterday") : t("calls.ago.days", { count: days });
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
  showSimulator = false,
}: {
  rows: CallRow[];
  initialFilter: CallFilter;
  defaultLang?: SupportedLanguage;
  showSimulator?: boolean;
}) {
  const t = useT();
  const [filter, setFilter] = useState<CallFilter>(initialFilter);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(defaultLang);
  const [quickLogTarget, setQuickLogTarget] = useState<QuickLogTarget | null>(null);
  const [simulatorPatientId, setSimulatorPatientId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [logStatusMessage, setLogStatusMessage] = useState<string | null>(null);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, rows.filter(f.test).length])), [rows]);
  const visible = useMemo(() => {
    const activeFilter = FILTERS.find((f) => f.id === filter);
    return rows.filter(activeFilter ? activeFilter.test : () => true);
  }, [rows, filter]);

  // Incremental rendering: only the first `limit` rows are mounted. Selection,
  // select-all and counts keep operating on the FULL `visible` set.
  const [limit, setLimit] = useState(PAGE_SIZE);
  const shown = useMemo(() => visible.slice(0, limit), [visible, limit]);
  const remaining = remainingCount(visible.length, limit);

  const handleQuickSubmit = (outcome: ManualContactOutcome, notes?: string) => {
    if (!quickLogTarget) return;
    const target = quickLogTarget;
    startTransition(async () => {
      const res = await submitQuickContact(target.patientId, target.channel, outcome, notes);
      if (res.error) {
        setLogStatusMessage(t("calls.quick.error", { error: res.error }));
      } else {
        setLogStatusMessage(res.queued ? t("calls.quick.savedOffline") : t("calls.quick.logged", { outcome: t(OUTCOME[outcome].labelKey) }));
        setTimeout(() => {
          setQuickLogTarget(null);
          setLogStatusMessage(null);
        }, 600);
      }
    });
  };

  // Batch contact logging state
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const selectedIds = useMemo(() => visible.filter((r) => selection.has(r.id)).map((r) => r.id), [visible, selection]);
  const allSelected = visible.length > 0 && selectedIds.length === visible.length;
  const partiallySelected = selectedIds.length > 0 && !allSelected;
  const [batchOutcome, setBatchOutcome] = useState<ContactOutcome>("no_answer");
  const [batchNotes, setBatchNotes] = useState("");
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [batchToast, setBatchToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isBatchPending, startBatchTransition] = useTransition();

  const toggleSelect = useCallback((id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [setSelection]);

  const triggerCall = useCallback((r: CallRow) => {
    // The tel: link on the row places the call; here we only open the outcome sheet.
    setQuickLogTarget({ patientId: r.id, name: r.name, phone: r.phone, channel: "call" });
  }, []);

  const triggerWhatsApp = useCallback((r: CallRow, waLink: string | null) => {
    setQuickLogTarget({
      patientId: r.id,
      name: r.name,
      phone: r.phone,
      channel: "whatsapp",
      whatsappUrl: waLink,
      messagesByLang: r.messagesByLang,
    });
  }, []);


  const changeFilter = (next: CallFilter) => {
    if (next === filter) return;
    setFilter(next);
    setLimit(PAGE_SIZE);
    setSelection(new Set());
  };

  const getBatchOutcomeLabel = (out: ContactOutcome) => {
    const o = OUTCOME[out];
    return o ? t(o.labelKey) : out;
  };

  const handleBatchSubmit = () => {
    if (selectedIds.length === 0) return;
    const ids = selectedIds;
    const finalNotes =
      batchOutcome === "automated_reminder"
        ? (batchNotes.trim() ? `Automated reminder sent: ${batchNotes.trim()}` : "Automated WhatsApp reminder sent")
        : (batchNotes.trim() || undefined);

    startBatchTransition(async () => {
      const res = await logBatchContacts(ids, batchOutcome, finalNotes, batchOutcome === "automated_reminder" ? "whatsapp" : "call");
      setShowBatchConfirm(false);
      if (res.error) {
        setBatchToast({ message: res.error, type: "error" });
      } else {
        const skippedMsg = res.skippedCount > 0 ? ` ${t("calls.batch.skipped", { count: res.skippedCount })}` : "";
        setBatchToast({
          message: `${t("calls.batch.logged", { count: res.loggedCount })}${skippedMsg}`,
          type: "success",
        });
        setSelection(new Set());
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
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible md:pb-0" role="group" aria-label={t("calls.filter.aria")}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => changeFilter(f.id)}
                className={chipClass(filter === f.id)}
              >
                {t(f.labelKey)} <span className={chipCountClass(filter === f.id)}>{counts[f.id]}</span>
              </button>
            ))}
          </div>

          {/* Action Tools: WhatsApp Bot Simulator & Language Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {showSimulator && (
              <button
                type="button"
                disabled={visible.length === 0}
                onClick={() => setSimulatorPatientId(visible[0].id)}
                className="press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3.5 text-[13px] font-medium text-[var(--color-foreground)] enabled:hover:border-[var(--color-primary)] enabled:hover:text-[var(--color-primary)] disabled:opacity-50 md:min-h-9"
                title={t("calls.toolbar.botTitle")}
              >
                <Robot size={15} weight="bold" />
                <span>{t("calls.toolbar.bot")}</span>
              </button>
            )}

            {/* WhatsApp Language Switcher */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("calls.toolbar.language")}>
              <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-charcoal)]">
                <Translate size={14} className="text-[var(--color-primary)]" />
                <span>{t("calls.toolbar.language")}</span>
              </span>
              <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] p-1">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    aria-pressed={selectedLang === l.code}
                    onClick={() => setSelectedLang(l.code)}
                    className={`min-h-11 min-w-11 rounded-full px-3 text-[13px] font-medium transition-colors ${
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
              aria-label={t("common.close")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-buttons)] opacity-75 hover:opacity-100"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        )}

        {/* Batch Selection Header Toolbar */}
        {visible.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface-1)] border-b border-[var(--color-border)] text-[13px] text-[var(--color-charcoal)]">
            <label className="flex min-h-10 items-center gap-2 cursor-pointer font-medium text-[var(--color-foreground)] select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => setSelection(new Set(event.currentTarget.checked ? visible.map((r) => r.id) : []))}
                ref={(el) => {
                  if (el) el.indeterminate = partiallySelected;
                }}
                className="h-4 w-4 accent-[var(--color-primary)] rounded cursor-pointer"
                aria-label={t("calls.select.allAria")}
              />
              <span>{t("calls.select.all", { count: visible.length })}</span>
            </label>

            {selectedIds.length > 0 && (
              <span className="font-semibold text-[var(--color-primary)]">
                {t("calls.select.count", { count: selectedIds.length })}
              </span>
            )}
          </div>
        )}

        <ol>
          {shown.map((r, i) => (
            <CallCard
              key={r.id}
              row={r}
              index={i}
              selectedLang={selectedLang}
              waLink={r.whatsappByLang?.[selectedLang] ?? r.whatsapp}
              isSelected={selection.has(r.id)}
              onToggleSelect={toggleSelect}
              onTriggerCall={triggerCall}
              onTriggerWhatsApp={triggerWhatsApp}
            />
          ))}
        </ol>

        {remaining > 0 && (
          <div className="border-t border-[var(--color-border)] px-4 py-3 text-center">
            <button
              type="button"
              onClick={() => setLimit((current) => nextLimit(current, visible.length))}
              className={buttonSecondary}
            >
              {t("calls.list.showMore", { count: remaining })}
            </button>
            <p className="num mt-1 text-[12px] text-[var(--color-charcoal)]" aria-live="polite">
              {t("calls.list.showing", { shown: shown.length, total: visible.length })}
            </p>
          </div>
        )}

        {visible.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-[var(--color-charcoal)]">
            {rows.length === 0 ? t("calls.list.emptyNone") : t("calls.list.emptyFilter")}
          </p>
        )}
      </div>

      {/* Quick-Log Bottom Sheet / Dialog */}
      {quickLogTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-pc-ink)]/50 p-0 sm:items-center sm:p-4"
        >
          <div className="max-sm:pc-sheet sm:pc-pop w-full max-w-lg rounded-t-[var(--radius-sections)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 pb-6 shadow-[var(--shadow-overlay)] sm:rounded-[var(--radius-sections)] sm:pb-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                {quickLogTarget.channel === "call" ? (
                  <PhoneCall size={20} className="text-[var(--color-primary)]" weight="fill" />
                ) : (
                  <WhatsappLogo size={20} className="text-[var(--color-on-track)]" weight="fill" />
                )}
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--color-foreground)]">
                    {quickLogTarget.channel === "call"
                      ? t("calls.quick.titleCall", { name: quickLogTarget.name })
                      : t("calls.quick.titleWhatsapp", { name: quickLogTarget.name })}
                  </h3>
                  <p className="num text-[12px] text-[var(--color-charcoal)]">
                    {quickLogTarget.phone ?? t("calls.card.noPhone")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickLogTarget(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-buttons)] text-[var(--color-charcoal)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
                aria-label={t("common.close")}
              >
                <X size={18} />
              </button>
            </div>

            {/* If WhatsApp, show language used and message preview */}
            {quickLogTarget.channel === "whatsapp" && quickLogTarget.messagesByLang && (
              <div className="my-3 rounded-[var(--radius-buttons)] p-2.5 bg-[var(--color-surface-1)] border border-[var(--color-border)] text-[12px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-[var(--color-charcoal)]">
                    {t("calls.quick.preview")}
                  </span>
                  <div className="inline-flex gap-1">
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setSelectedLang(l.code)}
                        className={`min-h-9 rounded-full px-2.5 text-[12px] font-medium border ${
                          selectedLang === l.code
                            ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                            : "bg-[var(--color-background)] text-[var(--color-charcoal)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
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
                  {t("calls.quick.selectOutcome")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("will_visit", "Patient confirmed visit")}
                    className="press flex min-h-14 items-center justify-between gap-2 rounded-[var(--radius-buttons)] px-3 text-left border border-[var(--color-on-track)] bg-[var(--color-on-track-surface)] text-[var(--color-on-track)] hover:opacity-90 font-medium text-[13px]"
                  >
                    <span>{t("calls.quick.willVisit")}</span>
                    <span className="text-[11px] opacity-75">{t("calls.quick.willVisitHint")}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("reached", "Spoke with patient")}
                    className="press flex min-h-14 items-center justify-between gap-2 rounded-[var(--radius-buttons)] px-3 text-left border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] text-[var(--color-foreground)] font-medium text-[13px]"
                  >
                    <span>{t("calls.quick.reached")}</span>
                    <span className="text-[11px] text-[var(--color-charcoal)]">{t("calls.quick.reachedHint")}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("no_answer", "Ringing, no response")}
                    className="press flex min-h-14 items-center justify-between gap-2 rounded-[var(--radius-buttons)] px-3 text-left border border-[var(--color-due)] bg-[var(--color-due-surface)] text-[var(--color-due)] hover:opacity-90 font-medium text-[13px]"
                  >
                    <span>{t("calls.quick.noAnswer")}</span>
                    <span className="text-[11px] opacity-75">{t("calls.quick.noAnswerHint")}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("wrong_number", "Wrong number or switched off")}
                    className="press flex min-h-14 items-center justify-between gap-2 rounded-[var(--radius-buttons)] px-3 text-left border border-[var(--color-overdue)] bg-[var(--color-overdue-surface)] text-[var(--color-overdue)] hover:opacity-90 font-medium text-[13px]"
                  >
                    <span>{t("calls.quick.wrongNumber")}</span>
                    <span className="text-[11px] opacity-75">{t("calls.quick.wrongNumberHint")}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleQuickSubmit("refused", "Patient declined follow-up")}
                    className="press flex min-h-12 items-center justify-between gap-2 rounded-[var(--radius-buttons)] px-3 text-left sm:col-span-2 border border-[var(--color-border)] text-[var(--color-charcoal)] hover:bg-[var(--color-surface-1)] text-[12px]"
                  >
                    <span>{t("calls.quick.refused")}</span>
                    <span className="text-[11px]">{t("calls.quick.refusedHint")}</span>
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
      {selectedIds.length > 0 && (
        <div
          role="region"
          aria-label={t("calls.batch.regionAria")}
          className="sticky bottom-[var(--mobile-nav-height)] md:bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-background)] p-3 shadow-[var(--shadow-overlay)]"
        >
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3 py-1 text-[12px] font-semibold text-white">
                <UsersThree size={16} weight="bold" />
                <span>{t("calls.select.count", { count: selectedIds.length })}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelection(new Set())}
                className="min-h-11 px-1 text-[13px] text-[var(--color-charcoal)] underline hover:text-[var(--color-foreground)] md:min-h-9"
              >
                {t("calls.batch.clear")}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
              <div className="flex items-center gap-1.5">
                <label htmlFor="batch-outcome" className="text-[13px] font-medium text-[var(--color-charcoal)]">
                  {t("calls.batch.outcome")}
                </label>
                <select
                  id="batch-outcome"
                  value={batchOutcome}
                  onChange={(e) => setBatchOutcome(e.target.value as ContactOutcome)}
                  className="min-h-11 rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 text-[16px] font-medium md:min-h-10 md:text-[13px]"
                >
                  <option value="no_answer">{t("calls.batch.opt.noAnswer")}</option>
                  <option value="reached">{t("calls.batch.opt.reached")}</option>
                  <option value="will_visit">{t("calls.batch.opt.willVisit")}</option>
                  <option value="wrong_number">{t("calls.batch.opt.wrongNumber")}</option>
                  <option value="refused">{t("calls.batch.opt.refused")}</option>
                  <option value="automated_reminder">{t("calls.batch.opt.automated")}</option>
                </select>
              </div>

              <input
                type="text"
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                placeholder={t("calls.batch.notes")}
                aria-label={t("calls.batch.notes")}
                className="min-h-11 max-w-xs rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 text-[16px] md:min-h-10 md:text-[13px]"
              />

              <button
                type="button"
                onClick={() => setShowBatchConfirm(true)}
                disabled={isBatchPending}
                className={buttonPrimary}
              >
                <span>{t("calls.batch.logFor", { count: selectedIds.length })}</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-pc-ink)]/50 p-4"
        >
          <div className="pc-pop w-full max-w-md space-y-3 rounded-[var(--radius-sections)] border border-[var(--color-border)] bg-[var(--color-background)] p-5 shadow-[var(--shadow-overlay)]">
            <h3 id="batch-confirm-title" className="text-[15px] font-bold text-[var(--color-foreground)]">
              {t("calls.batch.confirmTitle")}
            </h3>
            <p className="text-xs text-[var(--color-charcoal)] leading-relaxed">
              {t("calls.batch.confirmBody", { outcome: getBatchOutcomeLabel(batchOutcome), count: selectedIds.length })}
            </p>
            <p className="text-[11px] text-[var(--color-charcoal)]">
              {t("calls.batch.confirmNote")}
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-3">
              <button
                type="button"
                onClick={() => setShowBatchConfirm(false)}
                disabled={isBatchPending}
                className={buttonSecondary}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleBatchSubmit}
                disabled={isBatchPending}
                className={buttonPrimary}
              >
                {isBatchPending ? t("calls.batch.logging") : t("calls.batch.confirmYes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================================
   Call row: one patient in the queue
   ========================================================================= */

const REASON_TONE: Record<ReminderReason, Tone> = { overdue: "critical", lost: "critical", at_risk: "warning", due_soon: "warning" };
const REASON_KEY: Record<ReminderReason, MsgKey> = {
  overdue: "calls.reason.overdue",
  lost: "calls.reason.lost",
  at_risk: "calls.reason.at_risk",
  due_soon: "calls.reason.due_soon",
};

const CallCard = memo(function CallCard({
  row: r,
  index: i,
  selectedLang,
  waLink,
  isSelected,
  onToggleSelect,
  onTriggerCall,
  onTriggerWhatsApp,
}: {
  row: CallRow;
  index: number;
  selectedLang: SupportedLanguage;
  waLink: string | null;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onTriggerCall: (row: CallRow) => void;
  onTriggerWhatsApp: (row: CallRow, waLink: string | null) => void;
}) {
  const t = useT();
  const [showLog, setShowLog] = useState(false);
  const calledToday = r.contactedToday;
  const due =
    r.overdueItems.length > 0
      ? t("calls.card.overdueItem", { days: r.overdueDays, item: careEventName(r.overdueItems[0].split("(")[0].trim(), t) }) +
        (r.overdueItems.length > 1 ? ` +${r.overdueItems.length - 1}` : "")
      : r.gaLabel;

  return (
    <li className="row-cv border-b border-[var(--color-border)] last:border-0">
      <div
        className={`flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3 md:flex-nowrap md:items-center ${
          isSelected ? "bg-[var(--color-primary-surface)]/50" : calledToday ? "bg-[var(--color-surface-1)]" : ""
        }`}
      >
        <label className="-ml-2 inline-flex min-h-11 min-w-10 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            id={`chk-${r.id}`}
            checked={isSelected}
            onChange={() => onToggleSelect(r.id)}
            className="h-4 w-4 cursor-pointer rounded border-[var(--color-border-strong)] accent-[var(--color-primary)]"
            aria-label={t("calls.select.rowAria", { name: r.name })}
          />
        </label>

        <div className="min-w-0 flex-1 basis-[12rem] space-y-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="num w-5 shrink-0 text-[12px] text-[var(--color-charcoal)]">{i + 1}</span>
            <StatusDot tone={REASON_TONE[r.reason]} />
            <Link href={`/patients/${r.id}`} className="inline-flex min-h-11 items-center text-[15px] font-semibold hover:underline md:min-h-8">
              {r.name}
            </Link>
            <span className="text-[12px] font-semibold text-[var(--color-charcoal)]">{t(REASON_KEY[r.reason])}</span>
          </div>
          <p className="num text-[13px] text-[var(--color-foreground)]">
            {due}
            <span className="text-[var(--color-charcoal)]">
              {due ? " · " : ""}
              {r.phone ?? t("calls.card.noPhone")}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {isLost(r.risk) && <Tag tone="critical">{t("calls.card.lostToFollowUp")}</Tag>}
            {isAtRisk(r.risk) && (
              <Tag tone="warning">{r.noAnswerStreak >= 2 ? t("calls.card.unreachable", { count: r.noAnswerStreak }) : t("calls.card.atRisk")}</Tag>
            )}
            {r.flags.map((f) => (
              <Tag key={f.code} tone={SEVERITY_TONE[f.severity]}>
                {flagLabel(f, t)}
              </Tag>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--color-charcoal)]">
            {calledToday && <Tag tone="ok">{t("calls.card.contactedToday")}</Tag>}
            {r.lastContact ? (
              <>
                <span>{t("calls.card.lastLabel")}:</span>
                <Tag tone={OUTCOME[r.lastContact.outcome].tone}>{t(OUTCOME[r.lastContact.outcome].labelKey)}</Tag>
                <span>
                  {r.lastContact.channel === "whatsapp" ? t("calls.channel.whatsapp") : t("calls.channel.call")} · {ago(t, r.lastContact.daysAgo)}
                </span>
              </>
            ) : (
              <span>{t("calls.card.neverContacted")}</span>
            )}
            <span className="num">· {t("calls.card.attempts", { count: r.attempts30d })}</span>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 pl-8 md:w-auto md:pl-0">
          {r.tel && (
            <a href={r.tel} onClick={() => onTriggerCall(r)} className={buttonPrimary}>
              <Phone size={16} weight="fill" aria-hidden /> {t("calls.card.call")}
            </a>
          )}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              onClick={() => onTriggerWhatsApp(r, waLink)}
              className={buttonSecondary}
              title={t("calls.card.whatsappTitle", { lang: SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel ?? "" })}
            >
              <WhatsappLogo size={16} aria-hidden />
              <span>{t("calls.channel.whatsapp")}</span>
            </a>
          )}
          <button type="button" onClick={() => setShowLog((v) => !v)} aria-expanded={showLog} className={buttonGhost}>
            {t("calls.card.logOutcome")}
            <CaretDown size={14} aria-hidden className={`transition-transform ${showLog ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {showLog && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3 md:pl-12">
          <ContactLogForm patientId={r.id} />
        </div>
      )}
    </li>
  );
});
