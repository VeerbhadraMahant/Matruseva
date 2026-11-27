"use client";

import { useT } from "@/lib/i18n/provider";
import { card, pageBody } from "@/components/ui";

export default function SettingsLoading() {
  const t = useT();
  return (
    <div aria-busy="true" aria-label={t("shell.loading.settings")} className={`${pageBody} pt-6 md:pt-9`}>
      <div className="pc-skeleton h-8 w-40" />
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="pc-skeleton h-4 w-28" />
          ))}
        </div>
        <div className="space-y-10">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-3">
              <div className="pc-skeleton h-5 w-40" />
              <div className="pc-skeleton h-4 w-3/4 max-w-md" />
              <div className={`space-y-4 p-5 ${card}`}>
                <div className="pc-skeleton h-11 w-full !rounded-xl" />
                <div className="pc-skeleton h-11 w-full !rounded-xl" />
                <div className="pc-skeleton ml-auto h-11 w-40 !rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
