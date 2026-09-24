"use client";

import { useActionState } from "react";
import { logContact, type ActionResult } from "@/app/(app)/calls/actions";
import { useFormStatus } from "react-dom";

const initialState: ActionResult = { error: null };
// min-h-11 (44px) meets the minimum touch target size (Apple HIG 44pt / Material 48dp)
const selectClass =
  "min-h-11 rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

function LogButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-[var(--radius-buttons)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "…" : "Log"}
    </button>
  );
}

export function ContactLogForm({ patientId }: { patientId: string }) {
  const action = logContact.bind(null, patientId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <select name="channel" defaultValue="call" className={selectClass} aria-label="Contact channel">
        <option value="call">Call</option>
        <option value="whatsapp">WhatsApp</option>
      </select>
      <select name="outcome" defaultValue="reached" className={selectClass} aria-label="Outcome">
        <option value="reached">Reached</option>
        <option value="no_answer">No answer</option>
        <option value="wrong_number">Wrong number</option>
        <option value="will_visit">Will visit</option>
        <option value="refused">Refused</option>
      </select>
      <LogButton />
      {state.error && <span className="text-sm text-[var(--color-overdue)]">{state.error}</span>}
    </form>
  );
}
