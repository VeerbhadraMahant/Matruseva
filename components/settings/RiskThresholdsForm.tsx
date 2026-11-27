"use client";

import { useActionState } from "react";
import { updateRiskThresholds, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";
import { FormError, FormFooter, inputClass, labelClass } from "./fields";

const initialState: ActionResult = { error: null };

export function RiskThresholdsForm({ atRiskDays, lostDays, readOnly = false }: { atRiskDays: number; lostDays: number; readOnly?: boolean }) {
  const t = useT();
  const [state, formAction] = useActionState(withSuccessToast(updateRiskThresholds, t("settings.thresholds.toast")), initialState);

  return (
    <form action={formAction} className="grid h-full content-start gap-4 sm:grid-cols-2">
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
          className={`${inputClass} num sm:max-w-28`}
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
          className={`${inputClass} num sm:max-w-28`}
          required
        />
      </div>
      {state.error && (
        <div className="sm:col-span-2">
          <FormError>{state.error}</FormError>
        </div>
      )}
      {!readOnly && (
        <div className="sm:col-span-2">
          <FormFooter>
            <SubmitButton>{t("settings.thresholds.save")}</SubmitButton>
          </FormFooter>
        </div>
      )}
    </form>
  );
}
