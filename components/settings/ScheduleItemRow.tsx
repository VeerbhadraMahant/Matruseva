"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { PencilSimple } from "@phosphor-icons/react";
import { updateScheduleItem, type ActionResult } from "@/app/(app)/settings/actions";
import { withSuccessToast } from "@/components/Toaster";
import { Tag } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";
import { FormError, inputClass } from "./fields";

const initialState: ActionResult = { error: null };
const weekLabelClass = "mb-1 block text-[12px] font-medium text-[var(--color-charcoal)]";
/** Weeks shown on the window bar; pregnancy runs to about 42. */
const BAR_WEEKS = 42;

const pressClass =
  "transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:active:scale-100";

/**
 * One ANC schedule milestone. Read as text plus a week bar; "Edit" opens the same
 * per-row form (same field names and server action) inline.
 */
export function ScheduleItemRow({
  id,
  name,
  windowStartWeek,
  windowEndWeek,
  isCritical,
  readOnly = false,
}: {
  id: string;
  name: string;
  windowStartWeek: number;
  windowEndWeek: number;
  isCritical: boolean;
  readOnly?: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  // useActionState keeps the last error after Cancel; hide it until the next submit.
  const [errorDismissed, setErrorDismissed] = useState(false);
  const save = withSuccessToast(updateScheduleItem, t("settings.schedule.toast"));
  const [state, formAction] = useActionState(async (prev: ActionResult, formData: FormData) => {
    setErrorDismissed(false);
    const result = await save(prev, formData);
    if (!result.error) setEditing(false);
    return result;
  }, initialState);

  const windowText =
    windowStartWeek === windowEndWeek
      ? t("settings.schedule.weekOne", { week: windowStartWeek })
      : t("settings.signoff.weeks", { start: windowStartWeek, end: windowEndWeek });
  const left = Math.min(100, Math.max(0, (windowStartWeek / BAR_WEEKS) * 100));
  const width = Math.max(2.5, Math.min(100 - left, ((windowEndWeek - windowStartWeek) / BAR_WEEKS) * 100));

  return (
    <li className={`relative transition-colors ${editing ? "bg-[var(--color-surface-1)]" : "hover:bg-[var(--color-surface-1)]/70"}`}>
      {editing && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-[var(--color-primary)]" />}
      <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_11rem_7.5rem_auto] sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-medium text-[var(--color-foreground)]">{name}</span>
          {isCritical && <Tag tone="critical">{t("settings.schedule.critical")}</Tag>}
        </div>
        <div aria-hidden className="relative hidden h-1.5 rounded-full bg-[var(--color-surface-2)] sm:block">
          <span
            className={`absolute inset-y-0 rounded-full ${isCritical ? "bg-[var(--color-primary)]" : "bg-[var(--color-pc-lilac-strong)]"}`}
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        </div>
        <span className="num order-last col-span-2 text-[13px] text-[var(--color-charcoal)] sm:order-none sm:col-span-1 sm:text-right">
          {windowText}
        </span>
        {!readOnly && (
          <button
            type="button"
            aria-expanded={editing}
            aria-controls={editing ? `schedule-edit-${id}` : undefined}
            aria-label={t("settings.schedule.editItem", { name })}
            onClick={() => setEditing((v) => !v)}
            className={`flex min-h-11 items-center gap-1.5 rounded-[var(--radius-buttons)] px-3 text-[13px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-surface)] ${pressClass}`}
          >
            <PencilSimple size={15} aria-hidden />
            {t("settings.schedule.edit")}
          </button>
        )}
      </div>

      {editing && (
        <form
          id={`schedule-edit-${id}`}
          action={formAction}
          className="flex flex-wrap items-end gap-x-4 gap-y-3 px-4 pb-4 pt-1 sm:px-5"
        >
          <input type="hidden" name="itemId" value={id} />
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
              autoFocus
              className={`${inputClass} num max-w-24`}
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
              className={`${inputClass} num max-w-24`}
            />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-[var(--color-foreground)]">
            <input type="checkbox" name="isCritical" defaultChecked={isCritical} className="h-5 w-5" />
            {t("settings.schedule.critical")}
          </label>
          <div className="flex gap-2 sm:ml-auto">
            <SaveButton />
            <button
              type="button"
              onClick={() => {
                setErrorDismissed(true);
                setEditing(false);
              }}
              className={`min-h-11 rounded-[var(--radius-buttons)] px-4 text-[13px] font-medium text-[var(--color-charcoal)] hover:bg-[var(--color-surface-2)] ${pressClass}`}
            >
              {t("settings.schedule.cancel")}
            </button>
          </div>
          {state.error && !errorDismissed && (
            <div className="w-full">
              <FormError>{state.error}</FormError>
            </div>
          )}
        </form>
      )}
    </li>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`min-h-11 rounded-[var(--radius-buttons)] bg-[var(--color-primary)] px-5 text-[13px] font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60 ${pressClass}`}
    >
      {pending ? t("common.saving") : t("settings.schedule.save")}
    </button>
  );
}
