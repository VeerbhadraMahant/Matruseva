"use client";

import { useActionState, useMemo, useState } from "react";
import { createPatient, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui";
import { eddFromLmp, gestationalAge, formatGA, trimester } from "@/lib/pregnancy";

const initialState: ActionResult = { error: null };

const inputClass =
  "min-h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 text-[14px] focus:border-[var(--color-primary)]";
const labelClass = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]";

function parseLocalDate(isoDate: string): Date | null {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function Field({ id, label, className = "", children }: { id: string; label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-[var(--color-border)] bg-[var(--color-background)]">
      <legend className="sr-only">{title}</legend>
      <p className="border-b border-[var(--color-border)] px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 p-3 sm:grid-cols-6">{children}</div>
    </fieldset>
  );
}

export default function NewPatientPage() {
  const [state, formAction] = useActionState(createPatient, initialState);
  const [lmp, setLmp] = useState("");

  const preview = useMemo(() => {
    const lmpDate = parseLocalDate(lmp);
    if (!lmpDate) return null;
    const ga = gestationalAge(lmpDate, new Date());
    if (ga.weeks > 44) return { error: "LMP is more than 44 weeks ago — check the date." };
    return {
      edd: eddFromLmp(lmpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      ga: formatGA(ga),
      trimester: trimester(ga),
    };
  }, [lmp]);

  return (
    <>
      <PageHeader title="Register patient" meta="The ANC schedule is generated from the LMP on save." />
      <form action={formAction} className="max-w-3xl space-y-4 p-4 md:p-6" noValidate>
        <Section title="Identity & contact">
          <Field id="name" label="Full name *" className="col-span-2 sm:col-span-4">
            <input id="name" name="name" type="text" required autoFocus className={inputClass} />
          </Field>
          <Field id="clinicPatientNo" label="OPD / card no." className="col-span-2">
            <input id="clinicPatientNo" name="clinicPatientNo" type="text" className={`${inputClass} num`} />
          </Field>
          <Field id="phone" label="Mobile" className="col-span-1 sm:col-span-3">
            <input id="phone" name="phone" type="tel" inputMode="numeric" placeholder="10-digit" className={`${inputClass} num`} />
          </Field>
          <Field id="altPhone" label="Alternate mobile" className="col-span-1 sm:col-span-3">
            <input id="altPhone" name="altPhone" type="tel" inputMode="numeric" className={`${inputClass} num`} />
          </Field>
          <Field id="address" label="Address / village" className="col-span-2 sm:col-span-6">
            <input id="address" name="address" type="text" className={inputClass} />
          </Field>
        </Section>

        <Section title="Obstetric history">
          <Field id="age" label="Age" className="sm:col-span-1">
            <input id="age" name="age" type="number" min={10} max={70} className={`${inputClass} num`} />
          </Field>
          <Field id="gravida" label="Gravida" className="sm:col-span-1">
            <input id="gravida" name="gravida" type="number" min={0} max={20} className={`${inputClass} num`} />
          </Field>
          <Field id="para" label="Para" className="sm:col-span-1">
            <input id="para" name="para" type="number" min={0} max={20} className={`${inputClass} num`} />
          </Field>
          <Field id="bloodGroup" label="Blood group" className="sm:col-span-1">
            <select id="bloodGroup" name="bloodGroup" className={inputClass} defaultValue="">
              <option value="">Unknown</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </Field>
          <label className="col-span-2 flex min-h-10 items-center gap-2 self-end border border-[var(--color-border-strong)] px-2.5 text-[14px]">
            <input type="checkbox" name="rhNegative" className="h-4 w-4 accent-[var(--color-primary)]" />
            Rh negative
          </label>
        </Section>

        <Section title="Dating">
          <Field id="lmp" label="Last menstrual period (LMP) *" className="col-span-2 sm:col-span-2">
            <input
              id="lmp"
              name="lmp"
              type="date"
              required
              className={`${inputClass} num`}
              value={lmp}
              onChange={(e) => setLmp(e.target.value)}
            />
          </Field>
          <div className="col-span-2 grid grid-cols-3 self-end border border-[var(--color-border)] sm:col-span-4">
            {preview && "error" in preview ? (
              <p className="col-span-3 px-3 py-2 text-[13px] text-[var(--color-overdue)]">{preview.error}</p>
            ) : (
              [
                ["EDD", preview?.edd],
                ["GA today", preview?.ga],
                ["Trimester", preview ? `T${preview.trimester}` : undefined],
              ].map(([label, value]) => (
                <div key={label} className="border-r border-[var(--color-border)] px-3 py-1.5 last:border-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">{label}</p>
                  <p className="num text-[14px] font-medium">{value ?? "—"}</p>
                </div>
              ))
            )}
          </div>
        </Section>

        {state.error && (
          <p role="alert" className="border-l-[3px] border-[var(--color-overdue)] bg-[var(--color-overdue-surface)] px-3 py-2 text-[13px] text-[var(--color-overdue)]">
            {state.error}
          </p>
        )}

        <div className="max-w-xs">
          <SubmitButton>Register & generate schedule</SubmitButton>
        </div>
      </form>
    </>
  );
}
