"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type ActionResult } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const initialState: ActionResult = { error: null };

export default function LoginPage() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <main className="flex min-h-dvh bg-[var(--color-canvas)]">
      <aside className="hidden w-[38%] max-w-[380px] flex-col justify-between bg-[var(--color-rail)] px-10 py-12 text-[var(--color-rail-text)] md:flex">
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-white">MatruSetu</p>
          <p className="mt-1 text-[12px]">Clinical worklist for OB-GYN practices</p>
        </div>
        <p className="text-[13px] leading-relaxed text-[var(--color-rail-text)]">
          Pregnancy tracking and OPD digitization, built for the desk you work at all day.
        </p>
      </aside>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <h1 className="mb-1 text-[20px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Sign in
          </h1>
          <p className="mb-6 text-[14px] text-[var(--color-charcoal)]">Welcome back to your clinic</p>

          <form action={formAction} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="min-h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px] focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="min-h-10 w-full border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 text-[15px] focus:border-[var(--color-primary)]"
              />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-[var(--color-overdue)]">
                {state.error}
              </p>
            )}

            <SubmitButton>Sign in</SubmitButton>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-[var(--color-charcoal)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            or
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <GoogleSignInButton />

          <p className="mt-6 text-sm">
            New clinic?{" "}
            <Link href="/signup" className="font-medium text-[var(--color-primary)] underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
