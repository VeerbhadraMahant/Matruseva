"use client";

import { useActionState } from "react";
import { recordVisit, type ActionResult } from "@/app/(app)/patients/[id]/actions";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ActionResult = { error: null };
const inputClass =
  "num min-h-9 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2 py-1 text-[14px] focus:border-[var(--color-primary)]";
const labelClass = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]";

export function VisitForm({ patientId }: { patientId: string }) {
  const action = recordVisit.bind(null, patientId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4" noValidate>
      <div>
        <label htmlFor="visitDate" className={labelClass}>
          Visit date
        </label>
        <input id="visitDate" name="visitDate" type="date" className={inputClass} />
      </div>
      <div>
        <label htmlFor="bpSys" className={labelClass}>
          BP sys
        </label>
        <input id="bpSys" name="bpSys" type="number" className={inputClass} />
      </div>
      <div>
        <label htmlFor="bpDia" className={labelClass}>
          BP dia
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
          FHR (bpm)
        </label>
        <input id="fhr" name="fhr" type="number" className={inputClass} />
      </div>
      <div>
        <label htmlFor="fundalHeight" className={labelClass}>
          Fundal ht (cm)
        </label>
        <input id="fundalHeight" name="fundalHeight" type="number" step="0.1" className={inputClass} />
      </div>
      <div>
        <label htmlFor="nextVisitDate" className={labelClass}>
          Next visit
        </label>
        <input id="nextVisitDate" name="nextVisitDate" type="date" className={inputClass} />
      </div>
      <div className="col-span-2 sm:col-span-4 xl:col-span-2 2xl:col-span-4">
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea id="notes" name="notes" rows={2} className={inputClass.replace("num ", "")} />
      </div>

      {state.error && (
        <p role="alert" className="col-span-2 text-[13px] text-[var(--color-overdue)] sm:col-span-4 xl:col-span-2 2xl:col-span-4">
          {state.error}
        </p>
      )}

      <div className="col-span-2 sm:col-span-4 xl:col-span-2 2xl:col-span-4">
        <SubmitButton>Save visit</SubmitButton>
      </div>
    </form>
  );
}
