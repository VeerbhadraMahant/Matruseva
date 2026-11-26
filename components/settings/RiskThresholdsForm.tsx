"use client";

import { useActionState } from "react";
import { updateRiskThresholds, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";
import { errorClass, inputClass, labelClass } from "@/components/ui";

const initialState: ActionResult = { error: null };

export function RiskThresholdsForm({ atRiskDays, lostDays }: { atRiskDays: number; lostDays: number }) {
  const t = useT();
  const [state, formAction] = useActionState(withSuccessToast(updateRiskThresholds, t("settings.thresholds.toast")), initialState);

  return (
    <form action={formAction} className="grid max-w-md gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="riskAtRiskDays" className={labelClass}>
          {t("settings.thresholds.atRisk")}
        </label>
        <input
          id="riskAtRiskDays"
          name="riskAtRiskDays"
          type="number"
          inputMode="numeric"
          min={1}
          defaultValue={atRiskDays}
          className={`${inputClass} num`}
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
          inputMode="numeric"
          min={1}
          defaultValue={lostDays}
          className={`${inputClass} num`}
          required
        />
      </div>
      {state.error && (
        <p role="alert" className={`${errorClass} sm:col-span-2`}>
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2 sm:max-w-56">
        <SubmitButton>{t("settings.thresholds.save")}</SubmitButton>
      </div>
    </form>
  );
}
