"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-10 w-full bg-[var(--color-primary)] px-4 text-[14px] font-semibold text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
