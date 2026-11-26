"use client";

import { useActionState, useState } from "react";
import { updateDoctorProfile, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";

const initialState: ActionResult = { error: null };
const inputClass =
  "min-h-10 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-sm focus:border-[var(--color-primary)]";

export function DoctorProfessionalDetailsForm({
  degree,
  yearsOfExperience,
}: {
  degree: string | null;
  yearsOfExperience: number | null;
}) {
  const t = useT();
  const [state, formAction] = useActionState(
    withSuccessToast(updateDoctorProfile, t("settings.profile.saved")),
    initialState,
  );
  const [degreeInput, setDegreeInput] = useState(degree ?? "");
  const [yearsInput, setYearsInput] = useState(yearsOfExperience?.toString() ?? "");

  return (
    <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs font-medium text-[var(--color-charcoal)]">
        <span>{t("settings.profile.degree")}</span>
        <input
          name="degree"
          value={degreeInput}
          onChange={(event) => setDegreeInput(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="space-y-1 text-xs font-medium text-[var(--color-charcoal)]">
        <span>{t("settings.profile.experience")}</span>
        <input
          type="number"
          name="yearsOfExperience"
          min={0}
          step={1}
          value={yearsInput}
          onChange={(event) => setYearsInput(event.target.value)}
          className={inputClass}
        />
      </label>
      {state.error && <p role="alert" className="text-sm text-[var(--color-overdue)] sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2 sm:w-fit">
        <SubmitButton>{t("settings.profile.save")}</SubmitButton>
      </div>
    </form>
  );
}
