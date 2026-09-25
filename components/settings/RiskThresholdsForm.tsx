"use client";

import { useActionState } from "react";
import { updateRiskThresholds, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ActionResult = { error: null };
const inputClass =
  "min-h-10 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-sm focus:border-[var(--color-primary)]";
const labelClass = "mb-1 block text-xs font-medium text-[var(--color-charcoal)]";

export function RiskThresholdsForm({ atRiskDays, lostDays }: { atRiskDays: number; lostDays: number }) {
  const [state, formAction] = useActionState(updateRiskThresholds, initialState);

  return (
    <form action={formAction} className="grid max-w-sm gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="riskAtRiskDays" className={labelClass}>
          Days overdue → &ldquo;at risk&rdquo;
        </label>
        <input
          id="riskAtRiskDays"
          name="riskAtRiskDays"
          type="number"
          min={1}
          defaultValue={atRiskDays}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label htmlFor="riskLostDays" className={labelClass}>
          Days overdue → &ldquo;lost&rdquo;
        </label>
        <input
          id="riskLostDays"
          name="riskLostDays"
          type="number"
          min={1}
          defaultValue={lostDays}
          className={inputClass}
          required
        />
      </div>
      {state.error && <p className="sm:col-span-2 text-sm text-[var(--color-overdue)]">{state.error}</p>}
      <div className="sm:col-span-2">
        <SubmitButton>Save thresholds</SubmitButton>
      </div>
    </form>
  );
}
