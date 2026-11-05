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
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";
import type { Translator } from "@/lib/i18n/translate-client";

const initialState: ActionResult = { error: null };
const textareaClass =
  "w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-[13px] leading-relaxed focus:border-[var(--color-primary)] outline-none";
const labelClass = "mb-1 block text-[12px] font-medium text-[var(--color-charcoal)]";

type MsgKey = Parameters<Translator>[0];

const FIELDS: { name: ReminderReason; labelKey: MsgKey; descKey: MsgKey }[] = [
  { name: "overdue", labelKey: "settings.templates.overdue.label", descKey: "settings.templates.overdue.desc" },
  { name: "due_soon", labelKey: "settings.templates.dueSoon.label", descKey: "settings.templates.dueSoon.desc" },
  { name: "at_risk", labelKey: "settings.templates.atRisk.label", descKey: "settings.templates.atRisk.desc" },
  { name: "lost", labelKey: "settings.templates.lost.label", descKey: "settings.templates.lost.desc" },
];

const LANG_NAME_KEY: Record<SupportedLanguage, MsgKey> = {
  en: "settings.lang.en",
  hi: "settings.lang.hi",
  mr: "settings.lang.mr",
};

/** Placeholder tokens shown literally inside the help sentence (rendered as <code>). */
const TOKEN_PARAMS = { name: "{name}", item: "{item}", clinic: "{clinic}" };

export function MessageTemplatesForm({ templates }: { templates: MessageTemplates }) {
  const t = useT();
  const langLabel = (l: { code: SupportedLanguage; nativeLabel: string }) => {
    const name = t(LANG_NAME_KEY[l.code]);
    return name === l.nativeLabel ? name : `${name} (${l.nativeLabel})`;
  };
  const [activeLang, setActiveLang] = useState<SupportedLanguage>(
    templates.default_lang ?? "en"
  );
  const [state, formAction] = useActionState(withSuccessToast(updateMessageTemplates, t("settings.templates.toast")), initialState);
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
              {t("settings.templates.certTitle")}
            </span>
            <span className="rounded-xl flex items-center gap-1 bg-white px-2 py-0.5 text-[10px] font-bold text-[#128C7E] border border-[#128C7E]/30">
              <CheckCircle size={12} weight="fill" />
              {t("settings.templates.certBadge")}
            </span>
          </div>
          <button
            type="button"
            disabled={isResetting}
            onClick={() => {
              startResetTransition(async () => {
                const res = await resetMessageTemplatesToCertified();
                if (res.error) {
                  setResetNotice(t("settings.templates.resetError", { error: res.error }));
                } else {
                  setResetNotice(t("settings.templates.resetDone"));
                  setTimeout(() => setResetNotice(null), 4000);
                }
              });
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#128C7E] hover:underline cursor-pointer"
          >
            <ArrowCounterClockwise size={13} className={isResetting ? "animate-spin" : ""} />
            <span>{t("settings.templates.reset")}</span>
          </button>
        </div>
        <p className="mt-1 text-[11px] text-[var(--color-charcoal)] leading-relaxed">
          {t("settings.templates.certBody")}
        </p>
        {resetNotice && (
          <p className="mt-1 text-[11px] font-medium text-[#166534]">{resetNotice}</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[13px] text-[var(--color-charcoal)]">
          {t("settings.templates.help", TOKEN_PARAMS)
            .split(/(\{name\}|\{item\}|\{clinic\})/)
            .map((part, i) =>
              /^\{(name|item|clinic)\}$/.test(part) ? (
                <code key={i} className="text-[12px] bg-[var(--color-surface-2)] px-1 font-mono">
                  {part}
                </code>
              ) : (
                part
              ),
            )}
        </p>
      </div>

      {/* Clinic Default Language Selector */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <label htmlFor="defaultLangSelect" className="text-[12px] font-semibold text-[var(--color-foreground)] block">
            {t("settings.templates.defaultLang")}
          </label>
          <p className="text-[11px] text-[var(--color-charcoal)]">
            {t("settings.templates.defaultLangHint")}
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
              {langLabel(l)}
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
              {langLabel(lang)}
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
                  {t(field.labelKey)}
                </label>
                <span className="text-[11px] text-[var(--color-charcoal)]">
                  {t(field.descKey)}
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
                {t("settings.templates.default", { text: defaultVal })}
              </p>
            </div>
          );
        })}
      </div>

      {state.error && <p className="text-[13px] text-[var(--color-overdue)]">{state.error}</p>}

      <div className="pt-2">
        <SubmitButton>{t("settings.templates.save", { language: t(LANG_NAME_KEY[activeLang]) })}</SubmitButton>
      </div>
    </form>
  );
}
