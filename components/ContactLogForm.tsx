"use client";

import { useOptimistic, useState } from "react";
import { logContact, type ActionResult } from "@/app/(app)/calls/actions";
import { useFormStatus } from "react-dom";
import { showToast } from "@/components/Toaster";

const initialState: ActionResult = { error: null };
const selectClass =
  "min-h-10 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 text-[13px]";

function LogButton({ logged }: { logged: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || logged}
      className="ml-2 min-h-10 rounded-xl bg-[var(--color-primary)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
    >
      {logged ? "Logged ✓" : "Log"}
    </button>
  );
}

export function ContactLogForm({ patientId }: { patientId: string }) {
  const [error, setError] = useState<string | null>(null);
  // Optimistic: shows the contact as logged immediately; reverts if the action fails.
  const [logged, setLogged] = useOptimistic(false);

  async function formAction(formData: FormData) {
    setError(null);
    setLogged(true);
    try {
      const result = await logContact(patientId, initialState, formData);
      if (result.error) setError(result.error);
      else showToast("Contact logged");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not log contact");
    }
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <select name="channel" defaultValue="call" className={selectClass} aria-label="Contact channel">
        <option value="call">Call</option>
        <option value="whatsapp">WhatsApp</option>
      </select>
      <select name="outcome" defaultValue="reached" className={selectClass} aria-label="Outcome">
        <option value="reached">Reached</option>
        <option value="will_visit">Will visit</option>
        <option value="no_answer">No answer</option>
        <option value="wrong_number">Wrong number</option>
        <option value="refused">Refused</option>
      </select>
      <LogButton logged={logged} />
      {error && (
        <span role="alert" className="ml-2 text-[13px] text-[var(--color-overdue)]">
          {error}
        </span>
      )}
    </form>
  );
}
