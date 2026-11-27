"use client";

import { Printer } from "@phosphor-icons/react";
import { useT } from "@/lib/i18n/provider";

export function PostnatalSummaryPrintButton() {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-xs transition-colors hover:bg-[var(--color-primary-hover)]"
    >
      <Printer size={15} weight="bold" />
      <span>{t("postnatalSummary.print")}</span>
    </button>
  );
}
