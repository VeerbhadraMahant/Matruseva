"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle, Sparkle } from "@phosphor-icons/react";
import { signup, loginDemo, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormError, PasswordField, TextField } from "@/components/auth/AuthFields";
import { buttonSecondary } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";
import { DEMO_EMAIL } from "@/lib/demo";

const initialState: ActionResult = { error: null };

export function SignupForm({ demo }: { demo: boolean }) {
  const t = useT();
  const [state, formAction] = useActionState(signup, initialState);

  if (state.checkEmail) {
    return (
      <AuthShell>
        <div role="status">
          <CheckCircle size={40} weight="fill" className="text-[var(--color-on-track)]" aria-hidden />
          <h1 className="mb-1 mt-4 text-[22px] font-semibold tracking-tight text-[var(--color-foreground)]">
            {t("auth.signup.checkEmail.title")}
          </h1>
          <p className="text-[14px] text-[var(--color-charcoal)]">{t("auth.signup.checkEmail.body")}</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="mb-1 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
        {t("auth.signup.title")}
      </h1>
      <p className="mb-6 text-[14px] text-[var(--color-charcoal)]">{t("auth.signup.subtitle")}</p>
      <form action={formAction} className="space-y-4" noValidate>
        <TextField
          id="email"
          name="email"
          type="email"
          label={t("auth.field.email")}
          autoComplete="email"
          placeholder={demo ? DEMO_EMAIL : undefined}
          required
        />
        <PasswordField
          id="password"
          name="password"
          label={t("auth.field.password")}
          autoComplete="new-password"
          required
          minLength={8}
          hint={t("auth.signup.passwordHint")}
        />

        <FormError message={state.error} />

        <SubmitButton>{t("auth.signup.submit")}</SubmitButton>
      </form>

      <div className="my-5 flex items-center gap-3 text-[13px] text-[var(--color-charcoal)]">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        {t("auth.signup.or")}
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
      <GoogleSignInButton />

      <form action={loginDemo} className="mt-3">
        <button type="submit" className={`${buttonSecondary} w-full`}>
          <Sparkle size={18} weight="fill" className="text-[var(--color-primary)]" aria-hidden />
          {t("auth.login.demoButton")}
        </button>
      </form>

      <p className="mt-8 text-[14px] text-[var(--color-charcoal)]">
        {t("auth.signup.haveAccount")}{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-[var(--color-primary)] underline">
          {t("auth.signup.signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
