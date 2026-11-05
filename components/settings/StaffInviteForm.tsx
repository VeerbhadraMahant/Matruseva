"use client";

import { useActionState, useState } from "react";
import { inviteStaff, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";

const initialState: ActionResult = { error: null };
const inputClass =
  "min-h-10 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-sm focus:border-[var(--color-primary)]";
const labelClass = "mb-1 block text-xs font-medium text-[var(--color-charcoal)]";

export function StaffInviteForm() {
  const t = useT();
  const [state, formAction] = useActionState(withSuccessToast(inviteStaff, t("settings.invite.toast")), initialState);
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <form action={formAction} className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="fullName" className={labelClass}>
            {t("settings.invite.name")}
          </label>
          <input id="fullName" name="fullName" className={inputClass} required />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            {t("settings.invite.email")}
          </label>
          <input id="email" name="email" type="email" className={inputClass} required />
        </div>
        <div className="flex items-end">
          <SubmitButton>{t("settings.invite.add")}</SubmitButton>
        </div>
        {state.error && <p className="sm:col-span-3 text-sm text-[var(--color-overdue)]">{state.error}</p>}
      </form>

      {state.inviteLink && (
        <div className="mt-3 rounded-[var(--radius-cards)] bg-[var(--color-surface-1)] p-[var(--space-14)] text-sm">
          <p className="mb-2">
            {t("settings.invite.created")}
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
              className="min-h-10 shrink-0 rounded-[var(--radius-buttons)] border border-[var(--color-primary)] px-3 text-xs text-[var(--color-primary)]"
            >
              {copied ? t("settings.invite.copied") : t("settings.invite.copy")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
