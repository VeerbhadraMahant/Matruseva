"use client";

import { useState, useActionState, useTransition } from "react";
import { updateMessageTemplates, resetMessageTemplatesToCertified, type ActionResult } from "@/app/(app)/settings/actions";
import { ShieldCheck, ArrowCounterClockwise } from "@phosphor-icons/react";
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
import { Tag } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";
import type { Translator } from "@/lib/i18n/translate-client";
import { FormError, FormFooter, inputClass } from "./fields";

const initialState: ActionResult = { error: null };
const textareaClass = `${inputClass} py-2.5 leading-relaxed`;

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

export function MessageTemplatesForm({ templates, readOnly = false }: { templates: MessageTemplates; readOnly?: boolean }) {
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
    <form action={formAction} className="space-y-5">
      <div className="rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck size={18} weight="fill" aria-hidden className="text-[var(--color-on-track)]" />
            <span className="text-[13px] font-semibold text-[var(--color-foreground)]">{t("settings.templates.certTitle")}</span>
            <Tag tone="ok">{t("settings.templates.certBadge")}</Tag>
          </div>
          <button
            type="button"
            disabled={readOnly || isResetting}
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
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[var(--radius-buttons)] px-2 text-[13px] font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-surface)] disabled:opacity-50"
          >
            <ArrowCounterClockwise size={15} aria-hidden className={isResetting ? "animate-spin" : ""} />
            {t("settings.templates.reset")}
          </button>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-charcoal)]">{t("settings.templates.certBody")}</p>
        <div aria-live="polite">
          {resetNotice && <p className="mt-2 text-[13px] font-medium text-[var(--color-on-track)]">{resetNotice}</p>}
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-[var(--color-charcoal)]">
        {t("settings.templates.help", TOKEN_PARAMS)
          .split(/(\{name\}|\{item\}|\{clinic\})/)
          .map((part, i) =>
            /^\{(name|item|clinic)\}$/.test(part) ? (
              <code key={i} className="rounded bg-[var(--color-surface-2)] px-1 font-mono text-[12px] text-[var(--color-foreground)]">
                {part}
              </code>
            ) : (
              part
            ),
          )}
      </p>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center">
        <div>
          <label htmlFor="defaultLangSelect" className="block text-[13px] font-medium text-[var(--color-foreground)]">
            {t("settings.templates.defaultLang")}
          </label>
          <p className="text-[13px] text-[var(--color-charcoal)]">{t("settings.templates.defaultLangHint")}</p>
        </div>
        <select disabled={readOnly} id="defaultLangSelect" name="defaultLang" defaultValue={templates.default_lang ?? "en"} className={inputClass}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {langLabel(l)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)]" role="tablist">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            role="tab"
            aria-selected={activeLang === lang.code}
            onClick={() => setActiveLang(lang.code)}
            className={`-mb-px min-h-11 shrink-0 border-b-2 px-4 text-[13px] font-medium transition-colors ${
              activeLang === lang.code
                ? "border-[var(--color-primary)] font-semibold text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-charcoal)] hover:text-[var(--color-foreground)]"
            }`}
          >
            {langLabel(lang)}
          </button>
        ))}
      </div>

      <input type="hidden" name="lang" value={activeLang} />

      <div className="space-y-5">
        {FIELDS.map((field) => {
          const customVal = langOverrides[field.name] ?? "";
          const defaultVal = DEFAULT_TEMPLATES[activeLang][field.name];
          const id = `template-${activeLang}-${field.name}`;

          return (
            <div key={`${activeLang}-${field.name}`}>
              <label htmlFor={id} className="block text-[13px] font-medium text-[var(--color-foreground)]">
                {t(field.labelKey)}
              </label>
              <p id={`${id}-desc`} className="mb-1.5 text-[13px] text-[var(--color-charcoal)]">
                {t(field.descKey)}
              </p>
              <textarea
                readOnly={readOnly}
                id={id}
                name={field.name}
                rows={3}
                defaultValue={readOnly ? customVal || defaultVal : customVal}
                placeholder={defaultVal}
                aria-describedby={`${id}-desc`}
                className={textareaClass}
              />
              <p className="mt-1 text-[12px] text-[var(--color-charcoal)]">{t("settings.templates.default", { text: defaultVal })}</p>
            </div>
          );
        })}
      </div>

      {state.error && <FormError>{state.error}</FormError>}

      {!readOnly && (
        <FormFooter>
          <SubmitButton>{t("settings.templates.save", { language: t(LANG_NAME_KEY[activeLang]) })}</SubmitButton>
        </FormFooter>
      )}
    </form>
  );
}
