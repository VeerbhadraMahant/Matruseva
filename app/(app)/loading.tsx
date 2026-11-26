"use client";

import { useT } from "@/lib/i18n/provider";
import { card } from "@/components/ui";

/** Shared loading state for list pages: shaped like PageHeader + a toolbar + rowLink rows. */
export default function Loading() {
  const t = useT();
  return (
    <div role="status" aria-busy="true" aria-label={t("common.loading")} className="mx-auto w-full max-w-6xl px-4 pb-12 pt-5 md:px-8 md:pt-7">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="pc-skeleton h-7 w-48 max-w-full" />
          <div className="pc-skeleton h-3.5 w-64 max-w-full" />
        </div>
        <div className="pc-skeleton hidden h-10 w-36 shrink-0 md:block" />
      </div>

      <div className={`mt-5 overflow-hidden ${card}`}>
        <div className="flex gap-2 overflow-hidden p-3">
          <div className="pc-skeleton h-11 min-w-0 flex-1 md:h-10 md:max-w-sm" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="pc-skeleton hidden h-10 w-24 shrink-0 !rounded-full sm:block" />
          ))}
        </div>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex min-h-14 items-center gap-3 border-t border-[var(--color-border)]/70 px-4 py-3">
            <div className="pc-skeleton h-2.5 w-2.5 shrink-0 !rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="pc-skeleton h-3.5 w-40 max-w-full" />
              <div className="pc-skeleton h-3 w-56 max-w-full" />
            </div>
            <div className="pc-skeleton hidden h-6 w-20 shrink-0 !rounded-full sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
