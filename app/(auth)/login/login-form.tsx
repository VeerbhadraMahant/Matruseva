"use client";

import { useActionState } from "react";
import { login, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { AuthShell } from "@/components/auth/AuthShell";
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
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-[var(--color-charcoal)]">
                {t("auth.field.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={demo ? DEMO_EMAIL : undefined}
                required
                className="min-h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-[var(--color-charcoal)]">
                {t("auth.field.password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                defaultValue={demo ? DEMO_PASSWORD : undefined}
                required
                className="min-h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px]"
              />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-[var(--color-overdue)]">
                {state.error}
              </p>
            )}

            <SubmitButton>{t("auth.login.submit")}</SubmitButton>
          </form>
    </AuthShell>
  );
}
