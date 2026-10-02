"use client";

import { useState, useActionState, useTransition } from "react";
import { updateMessageTemplates, resetMessageTemplatesToCertified, type ActionResult } from "@/app/(app)/settings/actions";
import { ShieldCheck, CheckCircle, ArrowCounterClockwise } from "@phosphor-icons/react";
import { SubmitButton } from "@/components/SubmitButton";
import {
  DEFAULT_TEMPLATES,
  SUPPORTED_LANGUAGES,
  type MessageTemplates,
  type ReminderReason,
  type SupportedLanguage,
  type ReasonTemplates,
} from "@/lib/whatsapp";

const initialState: ActionResult = { error: null };
const textareaClass =
  "w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-[13px] leading-relaxed focus:border-[var(--color-primary)] outline-none";
const labelClass = "mb-1 block text-[12px] font-medium text-[var(--color-charcoal)]";

const FIELDS: { name: ReminderReason; label: string; description: string }[] = [
  {
    name: "overdue",
    label: "Overdue Care Event / Scan",
    description: "Sent when an ultrasound, lab test, or injection is past its due window.",
  },
  {
    name: "due_soon",
    label: "Due Soon Reminder",
    description: "Sent within 7 days of an upcoming test/scan due date.",
  },
  {
    name: "at_risk",
    label: "At Risk (Missed Clinic Visit)",
    description: "Sent when a patient has missed their booked OPD follow-up appointment.",
  },
  {
    name: "lost",
    label: "Lost to Follow-up Outreach",
    description: "Sent when a patient is overdue by >21 days to re-engage with antenatal care.",
  },
];

export function MessageTemplatesForm({ templates }: { templates: MessageTemplates }) {
  const [activeLang, setActiveLang] = useState<SupportedLanguage>(
    templates.default_lang ?? "en"
  );
  const [state, formAction] = useActionState(updateMessageTemplates, initialState);
  const [isResetting, startResetTransition] = useTransition();
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  // Extract templates for active language, falling back to legacy flat fields for 'en'
  const langOverrides: ReasonTemplates =
    (templates[activeLang] as ReasonTemplates | undefined) ??
    (activeLang === "en" ? (templates as ReasonTemplates) : {});

  return (
    <form action={formAction} className="space-y-4">
      {/* Clinical Lead Review & Certification Status */}
      <div className="rounded-xl border border-[#128C7E]/40 bg-[#E7F8EE]/60 p-3 text-[12px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} weight="fill" className="text-[#128C7E]" />
            <span className="font-semibold text-[var(--color-foreground)]">
              Multi-lingual Template Clinical Certification
            </span>
            <span className="rounded-xl flex items-center gap-1 bg-white px-2 py-0.5 text-[10px] font-bold text-[#128C7E] border border-[#128C7E]/30">
              <CheckCircle size={12} weight="fill" />
              Certified by Clinical Lead
            </span>
          </div>
          <button
            type="button"
            disabled={isResetting}
            onClick={() => {
              startResetTransition(async () => {
                const res = await resetMessageTemplatesToCertified();
                if (res.error) {
                  setResetNotice(`Error: ${res.error}`);
                } else {
                  setResetNotice("Restored clinically certified standard wording for all 3 languages.");
                  setTimeout(() => setResetNotice(null), 4000);
                }
              });
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#128C7E] hover:underline cursor-pointer"
          >
            <ArrowCounterClockwise size={13} className={isResetting ? "animate-spin" : ""} />
            <span>Reset to Certified Wording</span>
          </button>
        </div>
        <p className="mt-1 text-[11px] text-[var(--color-charcoal)] leading-relaxed">
          English, Hindi (हिंदी), and Marathi (मराठी) phrasing has been reviewed and certified with respectful honorifics (&quot;जी&quot;, &quot;ताई&quot;), calm maternal communication tone, and clear action steps for prenatal visits.
        </p>
        {resetNotice && (
          <p className="mt-1 text-[11px] font-medium text-[#166534]">{resetNotice}</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[13px] text-[var(--color-charcoal)]">
          Configure pre-filled WhatsApp reminder messages. Messages automatically substitute{" "}
          <code className="text-[12px] bg-[var(--color-surface-2)] px-1 font-mono">{"{name}"}</code> with the
          patient&apos;s name,{" "}
          <code className="text-[12px] bg-[var(--color-surface-2)] px-1 font-mono">{"{item}"}</code> with the scan/test
          name, and <code className="text-[12px] bg-[var(--color-surface-2)] px-1 font-mono">{"{clinic}"}</code> with the
          clinic name.
        </p>
      </div>

      {/* Clinic Default Language Selector */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <label htmlFor="defaultLangSelect" className="text-[12px] font-semibold text-[var(--color-foreground)] block">
            Clinic Default Language for WhatsApp Links:
          </label>
          <p className="text-[11px] text-[var(--color-charcoal)]">
            Used as the initial preselected language in the Call Queue worklist.
          </p>
        </div>
        <select
          id="defaultLangSelect"
          name="defaultLang"
          defaultValue={templates.default_lang ?? "en"}
          className="rounded-xl min-h-8 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 text-[13px] font-medium"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label} ({l.nativeLabel})
            </option>
          ))}
        </select>
      </div>

      {/* Language Tabs */}
      <div>
        <div className="flex border-b border-[var(--color-border-strong)]" role="tablist">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="tab"
              aria-selected={activeLang === lang.code}
              onClick={() => setActiveLang(lang.code)}
              className={`px-4 py-2 text-[13px] font-medium transition-colors border-t border-x -mb-px ${
                activeLang === lang.code
                  ? "border-[var(--color-border-strong)] border-b-transparent bg-[var(--color-background)] font-semibold text-[var(--color-foreground)]"
                  : "border-transparent text-[var(--color-charcoal)] hover:text-black hover:bg-[var(--color-surface-1)]"
              }`}
            >
              {lang.label} ({lang.nativeLabel})
            </button>
          ))}
        </div>
      </div>

      <input type="hidden" name="lang" value={activeLang} />

      {/* Template Fields for Active Language */}
      <div className="space-y-3.5 pt-1">
        {FIELDS.map((field) => {
          const customVal = langOverrides[field.name] ?? "";
          const defaultVal = DEFAULT_TEMPLATES[activeLang][field.name];

          return (
            <div key={`${activeLang}-${field.name}`}>
              <div className="flex items-baseline justify-between mb-1">
                <label htmlFor={`template-${activeLang}-${field.name}`} className={labelClass}>
                  {field.label}
                </label>
                <span className="text-[11px] text-[var(--color-charcoal)]">
                  {field.description}
                </span>
              </div>
              <textarea
                id={`template-${activeLang}-${field.name}`}
                name={field.name}
                rows={2}
                defaultValue={customVal}
                placeholder={defaultVal}
                className={textareaClass}
              />
              <p className="mt-1 text-[11px] text-[var(--color-charcoal)] italic">
                Default: &ldquo;{defaultVal}&rdquo;
              </p>
            </div>
          );
        })}
      </div>

      {state.error && <p className="text-[13px] text-[var(--color-overdue)]">{state.error}</p>}

      <div className="pt-2">
        <SubmitButton>Save {SUPPORTED_LANGUAGES.find((l) => l.code === activeLang)?.label} Templates</SubmitButton>
      </div>
    </form>
  );
}
