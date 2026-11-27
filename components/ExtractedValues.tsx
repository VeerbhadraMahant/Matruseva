"use client";

import { useMemo } from "react";
import { extractLabValues } from "@/lib/labValues";
import { useT } from "@/lib/i18n/provider";

/**
 * Key values read from OCR text, for a human to check against the scan.
 * Display-only: nothing here is written to the clinical record.
 */
export function ExtractedValues({ text }: { text: string | null | undefined }) {
  const t = useT();
  const values = useMemo(() => extractLabValues(text), [text]);
  if (values.length === 0) return null;

  return (
    <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]/50 text-[12px]">
      <summary className="cursor-pointer px-2.5 py-1.5 font-medium">
        {t("documents.values.title")} <span className="num text-[var(--color-charcoal)]">({values.length})</span>
      </summary>
      <div className="px-2.5 pb-2">
        <p className="mb-1.5 text-[var(--color-charcoal)]">{t("documents.values.hint")}</p>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          {values.map((v, i) => (
            <div key={`${v.key}-${i}`} className="contents">
              <dt className="text-[var(--color-charcoal)]">
                {v.label}
                {v.status !== "ok" && v.note && <span className="block text-[11px]">{v.note}</span>}
              </dt>
              <dd className="num text-right font-medium">
                {v.display}
                {v.status === "review" && <span className="ml-1.5 font-normal text-amber-700">{t("documents.values.check")}</span>}
                {v.status === "implausible" && <span className="ml-1.5 font-normal text-red-700">{t("documents.values.misread")}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
