"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { markCareEventDone, type ActionResult } from "@/app/(app)/patients/[id]/actions";

const initialState: ActionResult = { error: null };

function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-[var(--radius-buttons)] border border-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "…" : "Mark done"}
    </button>
  );
}

export function MarkDoneButton({ careEventId, patientId }: { careEventId: string; patientId: string }) {
  const action = markCareEventDone.bind(null, careEventId, patientId);
  const [, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <Button />
    </form>
  );
}
