"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { createPatient, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { ActionBar, PageHeader, card, helpClass, inputClass, labelClass, pageBody } from "@/components/ui";
import { eddFromLmp, formatGALocalized, gestationalAge, trimester } from "@/lib/pregnancy";
import { ObstetricQuestionnaireFields } from "@/components/ObstetricQuestionnaireFields";
import { useLocale, useT } from "@/lib/i18n/provider";
import { intlLocale } from "@/lib/i18n/intl";

const initialState: ActionResult = { error: null };

function parseLocalDate(isoDate: string): Date | null {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function Field({
  id,
  label,
  help,
  className = "",
  children,
}: {
  id: string;
  label: string;
  help?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {help && (
        <p id={`${id}-help`} className={helpClass}>
          {help}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className={`${card} min-w-0 px-4 pb-5 pt-1 md:px-5`}>
      <legend className="float-left w-full pb-3 pt-4 text-[16px] font-semibold text-[var(--color-foreground)]">{title}</legend>
      <div className="clear-both grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-6">{children}</div>
    </fieldset>
  );
}

export default function NewPatientPage() {
  const t = useT();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(createPatient, initialState);
  const [lmp, setLmp] = useState("");

  const preview = useMemo(() => {
    const lmpDate = parseLocalDate(lmp);
    if (!lmpDate) return null;
    const ga = gestationalAge(lmpDate, new Date());
    if (ga.weeks > 44) return { error: t("patients.new.lmpTooOld") };
    return {
      edd: eddFromLmp(lmpDate).toLocaleDateString(intlLocale(locale), { day: "2-digit", month: "short", year: "numeric" }),
      ga: formatGALocalized(ga, t),
      trimester: trimester(ga),
    };
  }, [lmp, t, locale]);

  return (
    <>
      <PageHeader title={t("patients.new.title")} meta={t("patients.new.meta")} />
      <div className={`${pageBody} pb-24 md:pb-12`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => formAction(data));
        }}
        className="max-w-3xl space-y-5"
        noValidate
      >
        <Section title={t("patients.new.sectionIdentity")}>
          <Field id="name" label={t("patients.new.fullName")} className="col-span-2 sm:col-span-4">
            <input id="name" name="name" type="text" required autoFocus className={inputClass} />
          </Field>
          <Field id="clinicPatientNo" label={t("patients.new.cardNo")} className="col-span-2">
            <input id="clinicPatientNo" name="clinicPatientNo" type="text" className={`${inputClass} num`} />
          </Field>
          <Field id="phone" label={t("patients.new.mobile")} className="col-span-1 sm:col-span-3">
            <input id="phone" name="phone" type="tel" inputMode="numeric" placeholder={t("patients.new.mobilePlaceholder")} className={`${inputClass} num`} />
          </Field>
          <Field id="altPhone" label={t("patients.new.altMobile")} className="col-span-1 sm:col-span-3">
            <input id="altPhone" name="altPhone" type="tel" inputMode="numeric" className={`${inputClass} num`} />
          </Field>
          <Field id="address" label={t("patients.new.address")} className="col-span-2 sm:col-span-6">
            <input id="address" name="address" type="text" className={inputClass} />
          </Field>
        </Section>

        <Section title={t("patients.new.sectionDating")}>
          <Field id="lmp" label={t("patients.new.lmp")} help={t("patients.new.lmpHelp")} className="col-span-2 sm:col-span-2">
            <input
              id="lmp"
              name="lmp"
              type="date"
              required
              aria-describedby="lmp-help"
              className={`${inputClass} num`}
              value={lmp}
              onChange={(e) => setLmp(e.target.value)}
            />
          </Field>
          <div className="col-span-2 grid grid-cols-3 self-start rounded-[var(--radius-buttons)] bg-[var(--color-primary-surface)]/60 sm:col-span-4" aria-live="polite">
            {preview && "error" in preview ? (
              <p className="col-span-3 px-3 py-2 text-[13px] text-[var(--color-overdue)]">{preview.error}</p>
            ) : (
              [
                [t("patients.new.previewEdd"), preview?.edd],
                [t("patients.new.previewGa"), preview?.ga],
                [t("patients.new.previewTrimester"), preview ? t("patients.trimesterShort", { trimester: preview.trimester }) : undefined],
              ].map(([label, value]) => (
                <div key={label} className="px-3 py-2">
                  <p className="text-[12px] font-medium text-[var(--color-charcoal)]">{label}</p>
                  <p className="num text-[14px] font-medium">{value ?? "—"}</p>
                </div>
              ))
            )}
          </div>
        </Section>

        <Section title={t("patients.new.sectionObstetric")}>
          <Field id="age" label={t("patients.new.age")} className="sm:col-span-1">
            <input id="age" name="age" type="number" min={10} max={70} className={`${inputClass} num`} />
          </Field>
          <Field id="gravida" label={t("patients.new.gravida")} className="sm:col-span-1">
            <input id="gravida" name="gravida" type="number" min={0} max={20} className={`${inputClass} num`} />
          </Field>
          <Field id="para" label={t("patients.new.para")} className="sm:col-span-1">
            <input id="para" name="para" type="number" min={0} max={20} className={`${inputClass} num`} />
          </Field>
          <Field id="bloodGroup" label={t("patients.new.bloodGroup")} className="sm:col-span-1">
            <select id="bloodGroup" name="bloodGroup" className={inputClass} defaultValue="">
              <option value="">{t("patients.new.unknown")}</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </Field>
          <label className="col-span-2 flex min-h-11 items-center gap-2.5 self-end rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[14px]">
            <input type="checkbox" name="rhNegative" className="h-5 w-5 accent-[var(--color-primary)]" />
            {t("patients.new.rhNegative")}
          </label>
          <p className={`${helpClass} col-span-2 sm:col-span-6`}>{t("patients.new.obstetricHelp")}</p>
        </Section>

        <ObstetricQuestionnaireFields />

        {state.error && (
          <p role="alert" className="rounded-[var(--radius-buttons)] bg-[var(--color-overdue-surface)] px-4 py-3 text-[13px] font-medium text-[var(--color-overdue)]">
            {state.error}
          </p>
        )}

        <ActionBar>
          <div className="md:w-72">
            <SubmitButton pending={pending}>{t("patients.new.submit")}</SubmitButton>
          </div>
        </ActionBar>
      </form>
      </div>
    </>
  );
}
