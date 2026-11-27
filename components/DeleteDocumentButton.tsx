"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import { deleteDocument } from "@/app/(app)/documents/actions";
import { showToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";

/** Doctor-only two-step delete button that removes a document from Supabase DB & Storage. */
export function DeleteDocumentButton({
  documentId,
  compact = false,
}: {
  documentId: string;
  compact?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteDocument(documentId);
      if (res.error) {
        setError(res.error);
        setConfirming(false);
        return;
      }
      setConfirming(false);
      showToast(t("documents.delete.toast"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-medium text-[var(--color-overdue)]">
            {t("documents.delete.confirm")}
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="min-h-8 rounded-[var(--radius-buttons)] bg-[var(--color-overdue)] px-2.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? t("documents.delete.deleting") : t("common.delete")}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={pending}
            className="min-h-8 rounded-[var(--radius-buttons)] border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 text-[12px] font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-1)] disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          aria-label={t("documents.delete.aria")}
          className={`inline-flex items-center gap-1 self-start rounded-[var(--radius-buttons)] border border-[var(--color-border)] text-[var(--color-overdue)] transition-colors hover:border-[var(--color-overdue)] hover:bg-[var(--color-overdue-surface)] ${
            compact ? "min-h-8 px-2 text-[12px] font-medium" : "min-h-9 px-2.5 text-[13px] font-medium"
          }`}
        >
          <Trash size={compact ? 13 : 14} aria-hidden />
          <span>{t("common.delete")}</span>
        </button>
      )}
      {error && (
        <p role="alert" className="text-[12px] text-[var(--color-overdue)]">
          {error}
        </p>
      )}
    </div>
  );
}
