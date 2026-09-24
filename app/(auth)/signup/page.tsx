"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ActionResult = { error: null };

export default function SignupPage() {
  const [state, formAction] = useActionState(signup, initialState);

  if (state.checkEmail) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] px-4">
        <div className="w-full max-w-sm rounded-[var(--radius-cards)] bg-[var(--color-surface-1)] p-[var(--space-42)]">
          <h1 className="mb-2 font-[var(--font-heading)] text-[var(--text-heading-sm)] font-light text-[var(--color-primary)]">
            Check your email
          </h1>
          <p className="text-[var(--color-foreground)]">
            We&apos;ve sent a confirmation link. Click it, then come back and sign in to finish setting up your clinic.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-cards)] bg-[var(--color-surface-1)] p-[var(--space-42)]">
        <h1 className="mb-2 font-[var(--font-heading)] text-[var(--text-heading)] font-light text-[var(--color-primary)]">
          MatruSetu
        </h1>
        <p className="mb-8 text-[var(--color-foreground)]">Create your clinic&apos;s account</p>

        <form action={formAction} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-[var(--radius-buttons)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <p className="mt-1 text-xs text-[var(--color-charcoal)]">At least 8 characters.</p>
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-[var(--color-overdue)]">
              {state.error}
            </p>
          )}

          <SubmitButton>Create account</SubmitButton>
        </form>

        <p className="mt-6 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--color-primary)] underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
