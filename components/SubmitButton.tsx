"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-[var(--radius-buttons)] bg-[var(--color-primary)] px-4 text-[15px] font-semibold text-[var(--color-primary-foreground)] shadow-[0_8px_18px_-10px_rgb(62_42_92/0.7)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
