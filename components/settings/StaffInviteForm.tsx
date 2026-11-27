"use client";

import { useActionState } from "react";
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
  return (
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
        {state.error && <p role="alert" className="sm:col-span-3 text-sm text-[var(--color-overdue)]">{state.error}</p>}
      </form>
  );
}
