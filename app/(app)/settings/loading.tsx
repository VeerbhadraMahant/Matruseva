"use client";

import { useT } from "@/lib/i18n/provider";
import { card, pageBody } from "@/components/ui";

export default function SettingsLoading() {
  const t = useT();
  return (
    <div aria-busy="true" aria-label={t("shell.loading.settings")} className={`${pageBody} pt-6 md:pt-9`}>
      <div className="pc-skeleton h-8 w-40" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className={`space-y-4 p-5 ${card}`}>
            <div className="pc-skeleton h-4 w-32" />
            <div className="pc-skeleton h-11 w-full !rounded-xl" />
            <div className="pc-skeleton h-11 w-full !rounded-xl" />
            <div className="pc-skeleton h-10 w-28 !rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
