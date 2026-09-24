"use client";

import { useActionState } from "react";
import { recordVisit, type ActionResult } from "@/app/(app)/patients/[id]/actions";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ActionResult = { error: null };
const inputClass =
  "min-h-11 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "mb-1 block text-xs font-medium text-[var(--color-charcoal)]";

export function VisitForm({ patientId }: { patientId: string }) {
  const action = recordVisit.bind(null, patientId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4" noValidate>
      <div>
        <label htmlFor="visitDate" className={labelClass}>
          Visit date
        </label>
        <input id="visitDate" name="visitDate" type="date" className={inputClass} />
      </div>
      <div>
        <label htmlFor="bpSys" className={labelClass}>
          BP systolic
        </label>
        <input id="bpSys" name="bpSys" type="number" className={inputClass} />
      </div>
      <div>
        <label htmlFor="bpDia" className={labelClass}>
          BP diastolic
        </label>
        <input id="bpDia" name="bpDia" type="number" className={inputClass} />
      </div>
      <div>
        <label htmlFor="weight" className={labelClass}>
          Weight (kg)
        </label>
        <input id="weight" name="weight" type="number" step="0.1" className={inputClass} />
      </div>
      <div>
        <label htmlFor="hb" className={labelClass}>
          Hb (g/dL)
        </label>
        <input id="hb" name="hb" type="number" step="0.1" className={inputClass} />
      </div>
      <div>
        <label htmlFor="fhr" className={labelClass}>
          FHR
        </label>
        <input id="fhr" name="fhr" type="number" className={inputClass} />
      </div>
      <div>
        <label htmlFor="fundalHeight" className={labelClass}>
          Fundal height
        </label>
        <input id="fundalHeight" name="fundalHeight" type="number" step="0.1" className={inputClass} />
      </div>
      <div>
        <label htmlFor="nextVisitDate" className={labelClass}>
          Next visit
        </label>
        <input id="nextVisitDate" name="nextVisitDate" type="date" className={inputClass} />
      </div>
      <div className="col-span-2 sm:col-span-4">
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea id="notes" name="notes" rows={2} className={inputClass} />
      </div>

      {state.error && (
        <p role="alert" className="col-span-2 text-sm text-[var(--color-overdue)] sm:col-span-4">
          {state.error}
        </p>
      )}

      <div className="col-span-2 sm:col-span-4">
        <SubmitButton>Save visit</SubmitButton>
      </div>
    </form>
  );
}
