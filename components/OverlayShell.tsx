"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "@phosphor-icons/react";
import { iconButton } from "@/components/ui";

/**
 * Shared overlay for the report-side modals: centred .pc-pop on desktop,
 * bottom .pc-sheet on phones, scrolling body, sticky footer, Escape and
 * backdrop to close. `onClose` is the single exit; guard it in the caller
 * when a request is in flight.
 */
export function OverlayShell({
  title,
  subtitle,
  badge,
  closeLabel,
  onClose,
  footer,
  size = "md",
  backdropClose = true,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
  footer?: React.ReactNode;
  size?: "md" | "lg";
  backdropClose?: boolean;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-foreground)]/45 sm:items-center sm:p-4"
      onClick={(e) => {
        if (backdropClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`pc-sheet flex max-h-[92dvh] w-full flex-col rounded-t-[var(--radius-cards)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-overlay)] outline-none sm:max-h-[88dvh] sm:rounded-[var(--radius-cards)] sm:[animation:pc-pop_var(--dur)_var(--ease-out)_both] ${
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)]/70 px-5 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="text-[18px] font-semibold leading-snug">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && <div className="mt-0.5 text-[13px] text-[var(--color-charcoal)]">{subtitle}</div>}
          </div>
          <button type="button" className={`${iconButton} -mr-2 -mt-1`} aria-label={closeLabel} onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)]/70 bg-[var(--color-surface-1)] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-b-[var(--radius-cards)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
