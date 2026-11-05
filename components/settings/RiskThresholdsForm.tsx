"use client";

import { useActionState } from "react";
import { updateRiskThresholds, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";

const initialState: ActionResult = { error: null };
const inputClass =
  "min-h-10 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-sm focus:border-[var(--color-primary)]";
const labelClass = "mb-1 block text-xs font-medium text-[var(--color-charcoal)]";

export function RiskThresholdsForm({ atRiskDays, lostDays }: { atRiskDays: number; lostDays: number }) {
  const t = useT();
  const [state, formAction] = useActionState(withSuccessToast(updateRiskThresholds, t("settings.thresholds.toast")), initialState);

  return (
    <form action={formAction} className="grid max-w-md gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="riskAtRiskDays" className={labelClass}>
          {t("settings.thresholds.atRisk")}
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
          {t("settings.thresholds.lost")}
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
        <SubmitButton>{t("settings.thresholds.save")}</SubmitButton>
      </div>
    </form>
  );
}
