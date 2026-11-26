"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateScheduleItem, type ActionResult } from "@/app/(app)/settings/actions";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";
import { buttonSecondary, errorClass, inputClass } from "@/components/ui";

const initialState: ActionResult = { error: null };

export function ScheduleItemRow({
  id,
  name,
  windowStartWeek,
  windowEndWeek,
  isCritical,
}: {
  id: string;
  name: string;
  windowStartWeek: number;
  windowEndWeek: number;
  isCritical: boolean;
}) {
  const t = useT();
  const [state, formAction] = useActionState(withSuccessToast(updateScheduleItem, t("settings.schedule.toast")), initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-border)]/70 py-3 last:border-0">
      <input type="hidden" name="itemId" value={id} />
      <span className="min-w-48 flex-1 text-[14px] font-medium">{name}</span>
      <label className="flex items-center gap-2 text-[13px] text-[var(--color-charcoal)]">
        {t("settings.schedule.fromWeek")}
        <input type="number" name="windowStartWeek" step="0.1" defaultValue={windowStartWeek} className={`${inputClass} num !w-20`} />
      </label>
      <label className="flex items-center gap-2 text-[13px] text-[var(--color-charcoal)]">
        {t("settings.schedule.toWeek")}
        <input type="number" name="windowEndWeek" step="0.1" defaultValue={windowEndWeek} className={`${inputClass} num !w-20`} />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-[13px] text-[var(--color-charcoal)] md:min-h-10">
        <input type="checkbox" name="isCritical" defaultChecked={isCritical} className="h-5 w-5" />
        {t("settings.schedule.critical")}
      </label>
      <SaveButton />
      {state.error && (
        <p role="alert" className={`${errorClass} w-full`}>
          {state.error}
        </p>
      )}
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonSecondary}>
      {pending ? "…" : t("settings.schedule.save")}
    </button>
  );
}
