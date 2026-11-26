"use client";

import { useActionState, useState } from "react";
import { inviteStaff, type ActionResult } from "@/app/(app)/settings/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { withSuccessToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";
import { buttonSecondary, errorClass, inputClass, labelClass } from "@/components/ui";

const initialState: ActionResult = { error: null };

export function StaffInviteForm() {
  const t = useT();
  const [state, formAction] = useActionState(withSuccessToast(inviteStaff, t("settings.invite.toast")), initialState);
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <form action={formAction} className="grid gap-4 sm:grid-cols-3">
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
        {state.error && <p role="alert" className={`${errorClass} sm:col-span-3`}>{state.error}</p>}
      </form>

      {state.inviteLink && (
        <div className="mt-3 rounded-[var(--radius-cards)] bg-[var(--color-surface-1)] p-4 text-[14px]">
          <p className="mb-2">
            {t("settings.invite.created")}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-[var(--radius-nav)] bg-[var(--color-background)] px-2 py-1 text-[12px]">
              {state.inviteLink}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.inviteLink!);
                setCopied(true);
              }}
              className={`${buttonSecondary} shrink-0`}
            >
              {copied ? t("settings.invite.copied") : t("settings.invite.copy")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
