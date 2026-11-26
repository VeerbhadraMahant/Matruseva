"use client";

import { useFormStatus } from "react-dom";
import { CircleNotch } from "@phosphor-icons/react";
import { useT } from "@/lib/i18n/provider";
import { buttonPrimary } from "@/components/ui";

export function SubmitButton({ children, pending: actionPending }: { children: React.ReactNode; pending?: boolean }) {
  const { pending: formPending } = useFormStatus();
  const pending = actionPending ?? formPending;
  const t = useT();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${buttonPrimary} w-full ${pending ? "!cursor-wait" : ""}`}>
      {pending && <CircleNotch size={18} className="animate-spin" aria-hidden />}
      {pending ? t("common.saving") : children}
    </button>
  );
}
