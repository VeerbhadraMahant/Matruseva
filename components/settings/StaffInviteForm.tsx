"use client";

import { useActionState, useState } from "react";
import { inviteStaff, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";
import { FormError, inputClass, labelClass } from "./fields";

const initialState: ActionResult = { error: null };

export function StaffInviteForm() {
  const t = useT();
  const [state, formAction] = useActionState(withSuccessToast(inviteStaff, t("settings.invite.toast")), initialState);
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <form action={formAction} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor="fullName" className={labelClass}>
            {t("settings.invite.name")}
          </label>
          <input id="fullName" name="fullName" autoComplete="off" className={inputClass} required />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            {t("settings.invite.email")}
          </label>
          <input id="email" name="email" type="email" autoComplete="off" className={inputClass} required />
        </div>
        <div className="sm:w-40">
          <SubmitButton>{t("settings.invite.add")}</SubmitButton>
        </div>
        {state.error && (
          <div className="sm:col-span-3">
            <FormError>{state.error}</FormError>
          </div>
        )}
      </form>

      {state.inviteLink && (
        <div role="status" className="mt-4 rounded-[var(--radius-buttons)] bg-[var(--color-surface-1)] p-4 text-[14px]">
          <p className="mb-3 text-[var(--color-charcoal)]">{t("settings.invite.created")}</p>
          <div className="flex items-center gap-2">
            <code className="min-h-11 flex-1 overflow-x-auto whitespace-nowrap rounded-[var(--radius-nav)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-[13px]">
              {state.inviteLink}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.inviteLink!);
                setCopied(true);
              }}
              className="min-h-11 shrink-0 rounded-[var(--radius-buttons)] border border-[var(--color-primary)] px-4 text-[13px] font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-surface)]"
            >
              {copied ? t("settings.invite.copied") : t("settings.invite.copy")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
