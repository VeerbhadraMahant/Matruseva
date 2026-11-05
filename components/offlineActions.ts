"use client";

import { recordVisit, type ActionResult } from "@/app/(app)/patients/[id]/actions";
import { logContact, quickLogContact } from "@/app/(app)/calls/actions";
import { showToast } from "@/components/Toaster";
import { offlineT } from "@/lib/offlineI18n";
import { formDataFields, submitOrQueue, type SubmitResult } from "@/lib/offlineSubmit";
import type { ContactOutcome } from "@/lib/supabase/enums";

/**
 * Form action for "Save visit": same as recordVisit, but when the server can't
 * be reached the visit is stored in the offline queue (see lib/offlineQueue.ts).
 * Server-returned errors are passed through unchanged.
 */
export function saveVisitAction(patientId: string) {
  return async (prev: ActionResult, formData: FormData): Promise<ActionResult> => {
    const r = await submitOrQueue({
      type: "visit",
      patientId,
      fields: formDataFields(formData),
      notify: showToast,
      run: (id) => {
        formData.set("clientRequestId", id);
        return recordVisit(patientId, prev, formData);
      },
    });
    if (!r.error && !r.queued) showToast(offlineT("shell.offline.visitSaved"));
    return { error: r.error };
  };
}

/** "Log" on the patient contact form. */
export function submitContactLog(patientId: string, formData: FormData): Promise<SubmitResult> {
  return submitOrQueue({
    type: "contact",
    patientId,
    fields: { ...formDataFields(formData), source: "form" },
    notify: showToast,
    run: (id) => {
      formData.set("clientRequestId", id);
      return logContact(patientId, { error: null }, formData);
    },
  });
}

/** One-tap outcome logging from the call queue. */
export function submitQuickContact(
  patientId: string,
  channel: "call" | "whatsapp",
  outcome: ContactOutcome,
  notes?: string,
): Promise<SubmitResult> {
  return submitOrQueue({
    type: "contact",
    patientId,
    fields: { channel, outcome, notes, source: "quick" },
    notify: showToast,
    run: (id) => quickLogContact(patientId, channel, outcome, notes, id),
  });
}
