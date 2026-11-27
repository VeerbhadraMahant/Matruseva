// Shared field styling for the settings forms: one label/input/help rhythm and one compact save footer.
// Disabled (read-only demo) fields keep full-contrast text on a quiet tint so values read as values, not as greyed-out blobs.
export const inputClass =
  "min-h-11 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-[14px] " +
  "disabled:cursor-default disabled:border-transparent disabled:bg-[var(--color-surface-1)] disabled:text-[var(--color-foreground)] " +
  "disabled:opacity-100 disabled:[-webkit-text-fill-color:var(--color-foreground)] " +
  "disabled:placeholder:text-[var(--color-charcoal)]";
export const labelClass = "mb-1.5 block text-[13px] font-medium text-[var(--color-foreground)]";

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-[13px] font-medium text-[var(--color-overdue)]">
      {children}
    </p>
  );
}

/** Save-button row: full width on phones, content-sized and left-aligned on wider screens; sits at the bottom of a stretched card. */
export function FormFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-auto flex pt-1">
      <div
        className={
          "w-full sm:w-auto sm:min-w-40 " +
          "[&_button]:text-[14px] [&_button]:transition-[transform,background-color,opacity] [&_button]:duration-150 " +
          "[&_button:active]:scale-[0.97] motion-reduce:[&_button:active]:scale-100"
        }
      >
        {children}
      </div>
    </div>
  );
}
