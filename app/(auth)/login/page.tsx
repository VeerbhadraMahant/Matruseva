"use client";

import { useActionState } from "react";
import { login, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthShell } from "@/components/auth/AuthShell";

const initialState: ActionResult = { error: null };

export default function LoginPage() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <AuthShell>
          <h1 className="mb-1 text-[24px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Sign in
          </h1>
          <p className="mb-6 text-[14px] text-[var(--color-charcoal)]">Welcome back to your clinic</p>

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
                defaultValue="demo.doctor@matrusetu.test"
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
                autoComplete="current-password"
                defaultValue="DemoClinic123!"
                required
                className="min-h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px]"
              />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-[var(--color-overdue)]">
                {state.error}
              </p>
            )}

            <SubmitButton>Sign in</SubmitButton>
          </form>
    </AuthShell>
  );
}
