"use client";

import { useActionState } from "react";
import { completeOnboarding, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ActionResult = { error: null };

export default function OnboardingPage() {
  const [state, formAction] = useActionState(completeOnboarding, initialState);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="w-full max-w-sm border border-[var(--color-border-strong)] border-t-4 border-t-[var(--color-primary)] bg-[var(--color-background)] p-6">
        <h1 className="mb-1 text-[20px] font-semibold tracking-tight text-[var(--color-foreground)]">
          Set up your clinic
        </h1>
        <p className="mb-6 text-[14px] text-[var(--color-charcoal)]">
          This creates your clinic and the default ANC schedule template, which you can edit later in Settings.
        </p>

        <form action={formAction} className="space-y-4" noValidate>
          <div>
            <label htmlFor="clinicName" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
              Clinic name
            </label>
            <input
              id="clinicName"
              name="clinicName"
              type="text"
              required
              className="min-h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px] focus:border-[var(--color-primary)]"
            />
          </div>
          <div>
            <label htmlFor="doctorFullName" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
              Your name
            </label>
            <input
              id="doctorFullName"
              name="doctorFullName"
              type="text"
              autoComplete="name"
              required
              className="min-h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px] focus:border-[var(--color-primary)]"
            />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-[var(--color-overdue)]">
              {state.error}
            </p>
          )}

          <SubmitButton>Create clinic</SubmitButton>
        </form>
      </div>
    </main>
  );
}
