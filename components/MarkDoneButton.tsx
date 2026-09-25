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
      className="min-h-8 whitespace-nowrap border border-[var(--color-border-strong)] px-2.5 text-[13px] font-medium hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : "Mark done"}
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
