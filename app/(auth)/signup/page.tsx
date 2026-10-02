"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react";
import { signup, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthShell } from "@/components/auth/AuthShell";

const initialState: ActionResult = { error: null };

export default function SignupPage() {
  const [state, formAction] = useActionState(signup, initialState);

  if (state.checkEmail) {
    return (
      <AuthShell>
        <div className="text-center">
          <CheckCircle size={40} weight="fill" className="mx-auto text-[var(--color-on-track)]" aria-hidden />
          <h1 className="mt-4 mb-1 text-[20px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Check your email
          </h1>
          <p className="text-[var(--color-charcoal)]">
            We&apos;ve sent a confirmation link. Click it, then come back and sign in to finish setting up your clinic.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
        <div>
          <h1 className="mb-1 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Set up your clinic
          </h1>
          <p className="mb-6 text-[14px] text-[var(--color-charcoal)]">Create an account for your OB-GYN practice</p>
          <form action={formAction} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-[var(--color-charcoal)]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="min-h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px]"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-[var(--color-charcoal)]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="min-h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px]"
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

          <div className="my-4 flex items-center gap-3 text-xs text-[var(--color-charcoal)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            or
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <GoogleSignInButton />

          <p className="mt-6 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--color-primary)] underline">
              Sign in
            </Link>
          </p>
        </div>
    </AuthShell>
  );
}
