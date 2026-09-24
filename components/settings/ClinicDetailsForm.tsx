"use client";

import { useActionState } from "react";
import { updateClinicDetails, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ActionResult = { error: null };
const inputClass =
  "min-h-11 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "mb-1 block text-xs font-medium text-[var(--color-charcoal)]";

export function ClinicDetailsForm({ name, city, phone }: { name: string; city: string | null; phone: string | null }) {
  const [state, formAction] = useActionState(updateClinicDetails, initialState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <div>
        <label htmlFor="name" className={labelClass}>
          Clinic name
        </label>
        <input id="name" name="name" defaultValue={name} className={inputClass} required />
      </div>
      <div>
        <label htmlFor="city" className={labelClass}>
          City
        </label>
        <input id="city" name="city" defaultValue={city ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor="phone" className={labelClass}>
          Phone
        </label>
        <input id="phone" name="phone" defaultValue={phone ?? ""} className={inputClass} />
      </div>
      {state.error && <p className="sm:col-span-3 text-sm text-[var(--color-overdue)]">{state.error}</p>}
      <div className="sm:col-span-3">
        <SubmitButton>Save clinic details</SubmitButton>
      </div>
    </form>
  );
}
