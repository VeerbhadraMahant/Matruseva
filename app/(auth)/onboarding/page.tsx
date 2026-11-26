"use client";

import { useActionState } from "react";
import { completeOnboarding, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormError, TextField } from "@/components/auth/AuthFields";
import { useT } from "@/lib/i18n/provider";

const initialState: ActionResult = { error: null };

export default function OnboardingPage() {
  const t = useT();
  const [state, formAction] = useActionState(completeOnboarding, initialState);

  return (
    <AuthShell>
      <h1 className="mb-1 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
        {t("auth.onboarding.title")}
      </h1>
      <p className="mb-6 text-[14px] text-[var(--color-charcoal)]">{t("auth.onboarding.subtitle")}</p>

      <form action={formAction} className="space-y-4" noValidate>
        <TextField id="clinicName" name="clinicName" label={t("auth.onboarding.clinicName")} required />
        <TextField id="doctorFullName" name="doctorFullName" label={t("auth.onboarding.yourName")} autoComplete="name" required />

        <FormError message={state.error} />

        <SubmitButton>{t("auth.onboarding.submit")}</SubmitButton>
      </form>
    </AuthShell>
  );
}
