"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, updatePassword, type ActionResult } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/auth/AuthShell";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/provider";

const initialState: ActionResult = { error: null };
const inputClass = "min-h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px]";
const labelClass = "grid gap-1.5 text-[13px] font-medium text-[var(--color-charcoal)]";

export function PasswordResetForm({ update = false, expired = false }: { update?: boolean; expired?: boolean }) {
  const t = useT();
  const [state, formAction] = useActionState(update ? updatePassword : requestPasswordReset, initialState);

  return (
    <AuthShell>
      <h1 className="mb-1 text-[24px] font-semibold tracking-tight">{t(update ? "auth.reset.updateTitle" : "auth.reset.requestTitle")}</h1>
      {!update && <p className="mb-5 text-[14px] text-[var(--color-charcoal)]">{t("auth.reset.requestBody")}</p>}
      {expired && <p role="alert" className="mb-4 text-sm text-[var(--color-overdue)]">{t("auth.reset.expired")}</p>}
      <form action={formAction} className="space-y-4">
        {update ? (
          <>
            <label className={labelClass}>
              {t("auth.field.password")}
              <input name="password" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
            </label>
            <label className={labelClass}>
              {t("auth.reset.confirmPassword")}
              <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
            </label>
          </>
        ) : (
          <label className={labelClass}>
            {t("auth.field.email")}
            <input name="email" type="email" autoComplete="email" required className={inputClass} />
          </label>
        )}
        {state.error && <p role="alert" className="text-sm text-[var(--color-overdue)]">{state.error}</p>}
        {(state.checkEmail || state.resetDemo) && (
          <p role="status" className="text-sm text-[var(--color-charcoal)]">
            {t(state.resetDemo ? "auth.reset.demo" : "auth.reset.checkEmail")}
          </p>
        )}
        <SubmitButton>{t(update ? "auth.reset.save" : "auth.reset.sendLink")}</SubmitButton>
      </form>
      <Link href="/login" className="mt-6 inline-block text-sm font-medium text-[var(--color-primary)] underline">
        {t("auth.reset.backToLogin")}
      </Link>
    </AuthShell>
  );
}
