"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Sparkle } from "@phosphor-icons/react";
import { login, loginDemo, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormError, PasswordField, TextField } from "@/components/auth/AuthFields";
import { buttonSecondary } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";

const initialState: ActionResult = { error: null };

export function LoginForm({ demo }: { demo: boolean }) {
  const t = useT();
  const [state, formAction] = useActionState(login, initialState);

  return (
    <AuthShell>
      <h1 className="mb-1 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
        {t("auth.login.title")}
      </h1>
      <p className="mb-6 text-[14px] text-[var(--color-charcoal)]">{t("auth.login.subtitle")}</p>

      <form action={formAction} className="space-y-4" noValidate>
        <TextField
          id="email"
          name="email"
          type="email"
          label={t("auth.field.email")}
          autoComplete="email"
          defaultValue={demo ? DEMO_EMAIL : undefined}
          required
        />
        <PasswordField
          id="password"
          name="password"
          label={t("auth.field.password")}
          autoComplete="current-password"
          defaultValue={demo ? DEMO_PASSWORD : undefined}
          required
          labelAside={
            <Link href="/forgot-password" className="text-[13px] font-medium text-[var(--color-primary)] underline">
              {t("auth.reset.forgot")}
            </Link>
          }
        />

        <FormError message={state.error} />

        <SubmitButton>{t("auth.login.submit")}</SubmitButton>
      </form>

      {demo && (
        <>
          <div className="my-5 flex items-center gap-3 text-[13px] text-[var(--color-charcoal)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            {t("auth.signup.or")}
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <form action={loginDemo}>
            <button type="submit" className={`${buttonSecondary} w-full`}>
              <Sparkle size={18} weight="fill" className="text-[var(--color-primary)]" aria-hidden />
              {t("auth.login.demoButton")}
            </button>
          </form>
        </>
      )}

      <p className="mt-8 text-[14px] text-[var(--color-charcoal)]">
        {t("auth.login.noAccount")}{" "}
        <Link href="/signup" className="inline-flex min-h-11 items-center font-medium text-[var(--color-primary)] underline">
          {t("auth.login.signUp")}
        </Link>
      </p>
    </AuthShell>
  );
}
