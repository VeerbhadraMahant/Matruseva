"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateScheduleItem, type ActionResult } from "@/app/(app)/settings/actions";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";
import { FormError, inputClass } from "./fields";

const initialState: ActionResult = { error: null };
const weekLabelClass = "mb-1 block text-[12px] font-medium text-[var(--color-charcoal)]";

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
    <form
      action={formAction}
      className="grid grid-cols-2 items-end gap-x-3 gap-y-3 px-4 py-4 sm:px-5 xl:grid-cols-[minmax(0,1fr)_6rem_6rem_auto_auto] xl:gap-x-4"
    >
      <input type="hidden" name="itemId" value={id} />
      <p className="col-span-2 text-[14px] font-medium text-[var(--color-foreground)] xl:col-span-1 xl:self-center">{name}</p>
      <div>
        <label htmlFor={`start-${id}`} className={weekLabelClass}>
          {t("settings.schedule.fromWeek")}
        </label>
        <input
          id={`start-${id}`}
          type="number"
          name="windowStartWeek"
          step="0.1"
          defaultValue={windowStartWeek}
          className={`${inputClass} num`}
        />
      </div>
      <div>
        <label htmlFor={`end-${id}`} className={weekLabelClass}>
          {t("settings.schedule.toWeek")}
        </label>
        <input
          id={`end-${id}`}
          type="number"
          name="windowEndWeek"
          step="0.1"
          defaultValue={windowEndWeek}
          className={`${inputClass} num`}
        />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-[var(--color-foreground)]">
        <input type="checkbox" name="isCritical" defaultChecked={isCritical} className="h-5 w-5" />
        {t("settings.schedule.critical")}
      </label>
      <SaveButton />
      {state.error && (
        <div className="col-span-2 xl:col-span-5">
          <FormError>{state.error}</FormError>
        </div>
      )}
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-[var(--radius-buttons)] border border-[var(--color-primary)] px-4 text-[13px] font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "…" : t("settings.schedule.save")}
    </button>
  );
}
