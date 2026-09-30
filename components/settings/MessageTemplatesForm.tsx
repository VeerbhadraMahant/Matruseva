"use client";

import { useState, useActionState } from "react";
import { updateMessageTemplates, type ActionResult } from "@/app/(app)/settings/actions";
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
const labelClass = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]";

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

  // Extract templates for active language, falling back to legacy flat fields for 'en'
  const langOverrides: ReasonTemplates =
    (templates[activeLang] as ReasonTemplates | undefined) ??
    (activeLang === "en" ? (templates as ReasonTemplates) : {});

  return (
    <form action={formAction} className="space-y-4">
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
      <div className="border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 flex flex-wrap items-center justify-between gap-3">
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
          className="min-h-8 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 text-[13px] font-medium"
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
