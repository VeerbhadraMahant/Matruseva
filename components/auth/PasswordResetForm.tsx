"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, updatePassword, type ActionResult } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormError, PasswordField, TextField } from "@/components/auth/AuthFields";
import { SubmitButton } from "@/components/SubmitButton";
import { useT } from "@/lib/i18n/provider";

const initialState: ActionResult = { error: null };

export function PasswordResetForm({ update = false, expired = false }: { update?: boolean; expired?: boolean }) {
  const t = useT();
  const [state, formAction] = useActionState(update ? updatePassword : requestPasswordReset, initialState);

  return (
    <AuthShell>
      <h1 className="mb-1 text-[24px] font-semibold tracking-tight">{t(update ? "auth.reset.updateTitle" : "auth.reset.requestTitle")}</h1>
      {!update && <p className="mb-6 text-[14px] text-[var(--color-charcoal)]">{t("auth.reset.requestBody")}</p>}
      {update && <div className="mb-6" />}
      {expired && <div className="mb-4"><FormError message={t("auth.reset.expired")} /></div>}
      <form action={formAction} className="space-y-4">
        {update ? (
          <>
            <PasswordField id="password" name="password" label={t("auth.field.password")} autoComplete="new-password" required minLength={8} />
            <PasswordField id="confirmPassword" name="confirmPassword" label={t("auth.reset.confirmPassword")} autoComplete="new-password" required minLength={8} />
          </>
        ) : (
          <TextField id="email" name="email" type="email" label={t("auth.field.email")} autoComplete="email" required />
        )}
        <FormError message={state.error} />
        {(state.checkEmail || state.resetDemo) && (
          <p role="status" className="text-[13px] text-[var(--color-charcoal)]">
            {t(state.resetDemo ? "auth.reset.demo" : "auth.reset.checkEmail")}
          </p>
        )}
        <SubmitButton>{t(update ? "auth.reset.save" : "auth.reset.sendLink")}</SubmitButton>
      </form>
      <Link href="/login" className="mt-6 inline-flex min-h-11 items-center text-[14px] font-medium text-[var(--color-primary)] underline">
        {t("auth.reset.backToLogin")}
      </Link>
    </AuthShell>
  );
}
