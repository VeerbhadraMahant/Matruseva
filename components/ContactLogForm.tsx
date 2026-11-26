"use client";

import { useOptimistic, useState } from "react";
import { submitContactLog } from "@/components/offlineActions";
import { useFormStatus } from "react-dom";
import { showToast } from "@/components/Toaster";
import { useT } from "@/lib/i18n/provider";
import { buttonPrimary } from "@/components/ui";

const CHANNELS = [
  { value: "call", key: "calls.channel.call" },
  { value: "whatsapp", key: "calls.channel.whatsapp" },
] as const;

const OUTCOMES = [
  { value: "reached", key: "calls.outcome.reached" },
  { value: "will_visit", key: "calls.outcome.willVisit" },
  { value: "no_answer", key: "calls.outcome.noAnswer" },
  { value: "wrong_number", key: "calls.outcome.wrongNumber" },
  { value: "refused", key: "calls.outcome.refused" },
] as const;

// Radio inputs styled as chips: same field names and values as the old selects.
const chip =
  "press inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3.5 text-[13px] font-medium text-[var(--color-foreground)] hover:border-[var(--color-primary)] peer-checked:border-[var(--color-primary)] peer-checked:bg-[var(--color-primary)] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-primary)] md:min-h-9";

function LogButton({ logged }: { logged: boolean }) {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button type="submit" disabled={pending || logged} className={buttonPrimary}>
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
    <form action={formAction} className="w-full space-y-3">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">{t("calls.log.channelLegend")}</legend>
        {CHANNELS.map((c) => (
          <label key={c.value} className="relative">
            <input type="radio" name="channel" value={c.value} defaultChecked={c.value === "call"} className="peer sr-only" />
            <span className={chip}>{t(c.key)}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">{t("calls.log.outcomeLegend")}</legend>
        {OUTCOMES.map((o) => (
          <label key={o.value} className="relative">
            <input type="radio" name="outcome" value={o.value} defaultChecked={o.value === "reached"} className="peer sr-only" />
            <span className={chip}>{t(o.key)}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <LogButton logged={logged} />
        {error && (
          <span role="alert" className="text-[13px] font-medium text-[var(--color-overdue)]">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
