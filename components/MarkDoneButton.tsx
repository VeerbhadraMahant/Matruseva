"use client";

import { useRef, useState, useTransition } from "react";
import { setCareEventCompletion } from "@/app/(app)/patients/[id]/actions";
import { showToast } from "@/components/Toaster";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";

const actionClass = `${buttonSecondary} min-h-11 whitespace-nowrap`;

export function MarkDoneButton({
  careEventId, patientId, todayIso, done,
}: {
  careEventId: string;
  patientId: string;
  todayIso: string;
  done: boolean;
}) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [completionToken, setCompletionToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function updateCompletion(date: string, undo: boolean) {
    setError(null);
    try {
      const result = await setCareEventCompletion(careEventId, patientId, date, undo);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCompletionToken(result.completionToken ?? null);
      dialog.current?.close();
      if (!undo) showToast(t("patientDetail.markDone.toast"));
    } catch {
      setError(t("patientDetail.error.markDoneFailed"));
    }
  }

  return (
    <>
      {done ? (completionToken && (
        <button type="button" className={actionClass} disabled={pending}
          onClick={() => startTransition(() => updateCompletion(completionToken, true))}>
          {t("patientDetail.markDone.undo")}
        </button>
      )) : (
        <button type="button" className={actionClass} disabled={pending}
          onClick={() => {
            setError(null);
            dialog.current?.showModal();
          }}>
          {t("patientDetail.markDone.button")}
        </button>
      )}
      <dialog
        ref={dialog}
        aria-label={t("patientDetail.markDone.confirmTitle")}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-5 text-left text-[var(--color-foreground)] shadow-xl backdrop:bg-black/60"
        onClose={() => setError(null)}
      >
        <form action={(data) => startTransition(() => updateCompletion(String(data.get("completedOn")), false))}
          className="space-y-4">
          <h3 className="text-[15px] font-semibold">{t("patientDetail.markDone.confirmTitle")}</h3>
          <label className="grid gap-1.5 text-[13px] font-medium">
            {t("patientDetail.markDone.date")}
            <input type="date" name="completedOn" required max={todayIso} defaultValue={todayIso}
              className="min-h-11 rounded-xl border border-[var(--color-border-strong)] px-3" />
          </label>
          {error && !done && <p role="alert" className="text-[13px] text-[var(--color-overdue)]">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className={actionClass} disabled={pending} onClick={() => dialog.current?.close()}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={`${buttonPrimary} min-h-11`} disabled={pending}>
              {t("patientDetail.markDone.confirm")}
            </button>
          </div>
        </form>
      </dialog>
      {error && done && <p role="alert" className="text-[13px] text-[var(--color-overdue)]">{error}</p>}
    </>
  );
}
