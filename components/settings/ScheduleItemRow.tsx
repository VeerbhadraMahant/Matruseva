"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateScheduleItem, type ActionResult } from "@/app/(app)/settings/actions";

const initialState: ActionResult = { error: null };
const inputClass =
  "min-h-11 w-20 rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

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
  const [state, formAction] = useActionState(updateScheduleItem, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] py-3 last:border-0">
      <input type="hidden" name="itemId" value={id} />
      <span className="min-w-48 flex-1 text-sm">{name}</span>
      <label className="flex items-center gap-1 text-xs text-[var(--color-charcoal)]">
        from wk
        <input type="number" name="windowStartWeek" step="0.1" defaultValue={windowStartWeek} className={inputClass} />
      </label>
      <label className="flex items-center gap-1 text-xs text-[var(--color-charcoal)]">
        to wk
        <input type="number" name="windowEndWeek" step="0.1" defaultValue={windowEndWeek} className={inputClass} />
      </label>
      <label className="flex items-center gap-1 text-xs text-[var(--color-charcoal)]">
        <input type="checkbox" name="isCritical" defaultChecked={isCritical} className="h-4 w-4" />
        Critical
      </label>
      <SaveButton />
      {state.error && <span className="w-full text-sm text-[var(--color-overdue)]">{state.error}</span>}
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-[var(--radius-buttons)] border border-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "…" : "Save"}
    </button>
  );
}
