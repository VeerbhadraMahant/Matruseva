"use client";

import { useT } from "@/lib/i18n/provider";
import { card } from "@/components/ui";

export default function TodayLoading() {
  const t = useT();
  return (
    <div aria-busy="true" aria-label={t("today.loading")}>
      <div className="mx-auto w-full max-w-6xl px-4 pb-1 pt-5 md:px-8 md:pt-7">
        <div className="pc-skeleton h-7 w-64 max-w-full" />
        <div className="pc-skeleton mt-2 h-3.5 w-44" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 md:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          <div className={`overflow-hidden ${card}`}>
            <div className="flex min-h-12 items-center border-b border-[var(--color-border)]/70 px-4">
              <div className="pc-skeleton h-4 w-40" />
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="pc-skeleton h-11 w-24 !rounded-full md:h-9" />
              ))}
            </div>
            <div className="divide-y divide-[var(--color-border)]/70 border-t border-[var(--color-border)]/70">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex min-h-[88px] items-start gap-3 px-4 py-3">
                  <div className="pc-skeleton mt-0.5 h-5 w-5 !rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="pc-skeleton h-4 w-40 max-w-full" />
                    <div className="pc-skeleton h-3.5 w-56 max-w-full" />
                    <div className="pc-skeleton h-3 w-32" />
                  </div>
                  <div className="pc-skeleton h-11 w-11" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4 md:space-y-5">
            {[3, 4].map((rows) => (
              <div key={rows} className={`overflow-hidden ${card}`}>
                <div className="flex min-h-12 items-center border-b border-[var(--color-border)]/70 px-4">
                  <div className="pc-skeleton h-4 w-36" />
                </div>
                <div className="divide-y divide-[var(--color-border)]/70">
                  {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
                      <div className="pc-skeleton h-3.5 w-32" />
                      <div className="pc-skeleton h-5 w-16 !rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
