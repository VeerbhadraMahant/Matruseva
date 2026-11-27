// Shared field styling for the settings forms: one label/input/help rhythm and one save-button footer.
export const inputClass =
  "min-h-11 w-full rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-3 py-2 text-[14px]";
export const labelClass = "mb-1.5 block text-[13px] font-medium text-[var(--color-foreground)]";

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-[13px] font-medium text-[var(--color-overdue)]">
      {children}
    </p>
  );
}

/** Save-button row: full width on phones, right-aligned and content-sized on wider screens. */
export function FormFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
      <div className="w-full sm:w-auto sm:min-w-52">{children}</div>
    </div>
  );
}
