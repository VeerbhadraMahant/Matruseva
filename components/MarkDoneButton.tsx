"use client";

import { useOptimistic, useState } from "react";
import { useFormStatus } from "react-dom";
import { markCareEventDone } from "@/app/(app)/patients/[id]/actions";
import { showToast } from "@/components/Toaster";

function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl min-h-8 whitespace-nowrap border border-[var(--color-border-strong)] px-2.5 text-[13px] font-medium hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:cursor-wait disabled:opacity-60"
    >
      Mark done
    </button>
  );
}

export function MarkDoneButton({ careEventId, patientId }: { careEventId: string; patientId: string }) {
  const [error, setError] = useState<string | null>(null);
  // Optimistic: flips to "Done" immediately while the action + revalidation are in flight,
  // and reverts automatically when the action finishes with an error.
  const [done, setDone] = useOptimistic(false);

  async function formAction() {
    setError(null);
    setDone(true);
    try {
      const result = await markCareEventDone(careEventId, patientId);
      if (result.error) setError(result.error);
      else showToast("Marked as done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not mark as done");
    }
  }

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      {done ? (
        <span
          role="status"
          className="inline-flex min-h-8 items-center whitespace-nowrap rounded-xl bg-[var(--color-primary)] px-2.5 text-[13px] font-medium text-white"
        >
          ✓ Done
        </span>
      ) : (
        <Button />
      )}
      {error && (
        <span role="alert" className="text-[13px] text-[var(--color-overdue)]">
          {error}
        </span>
      )}
    </form>
  );
}
