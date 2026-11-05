"use client";

import { useOptimistic, useState } from "react";
import { submitContactLog } from "@/components/offlineActions";
import { useFormStatus } from "react-dom";
import { showToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";

const selectClass =
  "min-h-10 border border-[var(--color-border-strong)] bg-[var(--color-background)] px-2.5 text-[13px]";

function LogButton({ logged }: { logged: boolean }) {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button
      type="submit"
      disabled={pending || logged}
      className="ml-2 min-h-10 rounded-xl bg-[var(--color-primary)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
    >
      {logged ? t("calls.log.done") : t("calls.log.submit")}
    </button>
  );
}

export function ContactLogForm({ patientId }: { patientId: string }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  // Optimistic: shows the contact as logged immediately; reverts if the action fails.
  const [logged, setLogged] = useOptimistic(false);

  async function formAction(formData: FormData) {
    setError(null);
    setLogged(true);
    try {
      const result = await submitContactLog(patientId, formData);
      if (result.error) setError(result.error);
      else if (!result.queued) showToast(t("calls.log.toast"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("calls.log.failed"));
    }
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <select name="channel" defaultValue="call" className={selectClass} aria-label={t("calls.log.channelAria")}>
        <option value="call">{t("calls.channel.call")}</option>
        <option value="whatsapp">{t("calls.channel.whatsapp")}</option>
      </select>
      <select name="outcome" defaultValue="reached" className={selectClass} aria-label={t("calls.log.outcomeAria")}>
        <option value="reached">{t("calls.outcome.reached")}</option>
        <option value="will_visit">{t("calls.outcome.willVisit")}</option>
        <option value="no_answer">{t("calls.outcome.noAnswer")}</option>
        <option value="wrong_number">{t("calls.outcome.wrongNumber")}</option>
        <option value="refused">{t("calls.outcome.refused")}</option>
      </select>
      <LogButton logged={logged} />
      {error && (
        <span role="alert" className="ml-2 text-[13px] text-[var(--color-overdue)]">
          {error}
        </span>
      )}
    </form>
  );
}
