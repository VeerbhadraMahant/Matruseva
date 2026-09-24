"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-[var(--radius-buttons)] bg-[var(--color-primary)] px-[var(--spacing-21)] py-[var(--spacing-14)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
