"use client";

import { useActionState } from "react";
import { completeOnboarding, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthShell } from "@/components/auth/AuthShell";
import { useT } from "@/lib/i18n/provider";

const initialState: ActionResult = { error: null };

export default function OnboardingPage() {
  const t = useT();
  const [state, formAction] = useActionState(completeOnboarding, initialState);

  return (
    <AuthShell>
      <div>
        <h1 className="mb-1 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
          {t("auth.onboarding.title")}
        </h1>
        <p className="mb-6 text-[14px] text-[var(--color-charcoal)]">
          {t("auth.onboarding.subtitle")}
        </p>

        <form action={formAction} className="space-y-4" noValidate>
          <div>
            <label htmlFor="clinicName" className="mb-1.5 block text-[13px] font-medium text-[var(--color-charcoal)]">
              {t("auth.onboarding.clinicName")}
            </label>
            <input
              id="clinicName"
              name="clinicName"
              type="text"
              required
              className="min-h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px]"
            />
          </div>
          <div>
            <label htmlFor="doctorFullName" className="mb-1.5 block text-[13px] font-medium text-[var(--color-charcoal)]">
              {t("auth.onboarding.yourName")}
            </label>
            <input
              id="doctorFullName"
              name="doctorFullName"
              type="text"
              autoComplete="name"
              required
              className="min-h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px]"
            />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-[var(--color-overdue)]">
              {state.error}
            </p>
          )}

          <SubmitButton>{t("auth.onboarding.submit")}</SubmitButton>
        </form>
      </div>
    </AuthShell>
  );
}
