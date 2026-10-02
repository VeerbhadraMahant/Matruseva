"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X } from "@phosphor-icons/react";

const TOAST_EVENT = "matrusetu:toast";
const DURATION_MS = 3500;

interface Toast {
  id: number;
  message: string;
}

/** Show a short confirmation ("Visit saved"). Safe to call from any client code. */
export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}

/**
 * Wraps a form action so a toast appears when it succeeds (no error returned).
 * The server action itself is unchanged.
 */
export function withSuccessToast<S extends { error: string | null }>(
  action: (prev: S, formData: FormData) => Promise<S>,
  message: string,
): (prev: S, formData: FormData) => Promise<S> {
  return async (prev, formData) => {
    const result = await action(prev, formData);
    if (!result.error) showToast(message);
    return result;
  };
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let next = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onToast = (e: Event) => {
      const message = (e as CustomEvent<string>).detail;
      const id = ++next;
      setToasts((list) => [...list.slice(-2), { id, message }]);
      const t = setTimeout(() => {
        setToasts((list) => list.filter((x) => x.id !== id));
        timers.delete(t);
      }, DURATION_MS);
      timers.add(t);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pc-rise pointer-events-auto flex items-center gap-3 rounded-2xl bg-[var(--color-pc-ink)] py-2.5 pl-3.5 pr-2 text-[14px] font-medium text-white shadow-[0_18px_40px_-12px_rgb(34_27_43/0.55)]"
        >
          <CheckCircle size={20} weight="fill" className="shrink-0 text-[#9fd9b4]" aria-hidden />
          {t.message}
          <button
            type="button"
            onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
