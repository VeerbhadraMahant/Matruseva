"use client";

import { useActionState, useState } from "react";
import { inviteStaff, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ActionResult = { error: null };
const inputClass =
  "min-h-11 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "mb-1 block text-xs font-medium text-[var(--color-charcoal)]";

export function StaffInviteForm() {
  const [state, formAction] = useActionState(inviteStaff, initialState);
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <form action={formAction} className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="fullName" className={labelClass}>
            Staff name
          </label>
          <input id="fullName" name="fullName" className={inputClass} required />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" name="email" type="email" className={inputClass} required />
        </div>
        <div className="flex items-end">
          <SubmitButton>Add staff</SubmitButton>
        </div>
        {state.error && <p className="sm:col-span-3 text-sm text-[var(--color-overdue)]">{state.error}</p>}
      </form>

      {state.inviteLink && (
        <div className="mt-3 rounded-[var(--radius-cards)] bg-[var(--color-surface-1)] p-[var(--space-14)] text-sm">
          <p className="mb-2">
            Account created. Share this one-time link with them so they can set their own password (no email is sent — the clinic
            has no SMTP configured yet):
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-[var(--radius-nav)] bg-[var(--color-background)] px-2 py-1 text-xs">
              {state.inviteLink}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.inviteLink!);
                setCopied(true);
              }}
              className="min-h-11 shrink-0 rounded-[var(--radius-buttons)] border border-[var(--color-primary)] px-3 text-xs text-[var(--color-primary)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
