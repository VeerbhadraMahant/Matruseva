"use client";

import { useActionState } from "react";
import { completeOnboarding, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ActionResult = { error: null };

export default function OnboardingPage() {
  const [state, formAction] = useActionState(completeOnboarding, initialState);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-cards)] bg-[var(--color-surface-1)] p-[var(--spacing-42)]">
        <h1 className="mb-2 font-[var(--font-heading)] text-[var(--text-heading-sm)] font-light text-[var(--color-primary)]">
          Set up your clinic
        </h1>
        <p className="mb-8 text-[var(--color-foreground)]">
          This creates your clinic and the default ANC schedule template, which you can edit later in Settings.
        </p>

        <form action={formAction} className="space-y-4" noValidate>
          <div>
            <label htmlFor="clinicName" className="mb-1 block text-sm font-medium">
              Clinic name
            </label>
            <input
              id="clinicName"
              name="clinicName"
              type="text"
              required
              className="w-full rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label htmlFor="doctorFullName" className="mb-1 block text-sm font-medium">
              Your name
            </label>
            <input
              id="doctorFullName"
              name="doctorFullName"
              type="text"
              autoComplete="name"
              required
              className="w-full rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
