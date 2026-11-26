"use client";

import { useT } from "@/lib/i18n/provider";
import { card } from "@/components/ui";

/** Loading state shaped like the patient record: identity strip, alerts, two columns. */
export default function PatientLoading() {
  const t = useT();
  return (
    <div aria-busy="true" aria-label={t("shell.loading.patient")} className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-12 pt-5 md:space-y-5 md:px-8 md:pt-7">
      <div className="pc-skeleton h-4 w-24" />

      <div className={`${card} px-4 py-4 md:px-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="pc-skeleton h-6 w-56 max-w-full" />
            <div className="pc-skeleton h-3.5 w-72 max-w-full" />
          </div>
          <div className="flex gap-2">
            <div className="pc-skeleton h-10 w-28 !rounded-[10px]" />
            <div className="pc-skeleton h-10 w-20 !rounded-[10px]" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--color-border)]/70 pt-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="pc-skeleton h-3 w-20" />
              <div className="pc-skeleton h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className={`flex gap-2 px-4 py-3 ${card}`}>
        <div className="pc-skeleton h-6 w-24 !rounded-full" />
        <div className="pc-skeleton h-6 w-32 !rounded-full" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className={card}>
            <div className="flex min-h-12 items-center border-b border-[var(--color-border)]/70 px-4">
              <div className="pc-skeleton h-4 w-32" />
            </div>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex min-h-14 items-center justify-between gap-3 border-t border-[var(--color-border)]/70 px-4 py-3 first:border-t-0">
                <div className="space-y-2">
                  <div className="pc-skeleton h-4 w-40" />
                  <div className="pc-skeleton h-3 w-52 max-w-full" />
                </div>
                <div className="pc-skeleton h-6 w-20 !rounded-full" />
              </div>
            ))}
          </div>
          <div className={`space-y-4 p-4 ${card}`}>
            <div className="pc-skeleton h-4 w-32" />
            <div className="pc-skeleton h-40 w-full !rounded-[10px]" />
          </div>
        </div>
        <div className="space-y-5">
          <div className={`space-y-4 p-4 ${card}`}>
            <div className="pc-skeleton h-4 w-32" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="pc-skeleton h-20 !rounded-[10px]" />
              ))}
            </div>
            <div className="pc-skeleton h-56 w-full !rounded-[10px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
