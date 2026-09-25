"use client";

import { useActionState } from "react";
import { logContact, type ActionResult } from "@/app/(app)/calls/actions";
import { useFormStatus } from "react-dom";

const initialState: ActionResult = { error: null };
const selectClass =
  "min-h-9 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-1.5 text-[13px] focus:border-[var(--color-primary)]";

function LogButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-9 border border-[var(--color-foreground)] bg-[var(--color-foreground)] px-3 text-[13px] font-semibold text-white hover:bg-black disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : "Log"}
    </button>
  );
}

export function ContactLogForm({ patientId }: { patientId: string }) {
  const action = logContact.bind(null, patientId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-center">
      <select name="channel" defaultValue="call" className={selectClass} aria-label="Contact channel">
        <option value="call">Call</option>
        <option value="whatsapp">WhatsApp</option>
      </select>
      <select name="outcome" defaultValue="reached" className={`${selectClass} -ml-px`} aria-label="Outcome">
        <option value="reached">Reached</option>
        <option value="will_visit">Will visit</option>
        <option value="no_answer">No answer</option>
        <option value="wrong_number">Wrong number</option>
        <option value="refused">Refused</option>
      </select>
      <LogButton />
      {state.error && (
        <span role="alert" className="ml-2 text-[13px] text-[var(--color-overdue)]">
          {state.error}
        </span>
      )}
    </form>
  );
}
