"use client";

import dynamic from "next/dynamic";
import { card } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";
import type { VisitDataPoint } from "@/components/VitalsTrendChartsImpl";

export type { VisitDataPoint };

interface VitalsTrendChartsProps {
  visits: VisitDataPoint[];
  lmp: string | null;
  edd: string | null;
  patientName: string;
}

function VitalsTrendsPlaceholder() {
  const t = useT();
  return (
    <div className={`min-h-[560px] ${card}`} role="status" aria-busy="true" aria-label={t("reports.charts.loadingAria")}>
      <div className="px-4 pt-4 text-[15px] font-semibold text-[var(--color-foreground)]">{t("reports.charts.title")}</div>
    </div>
  );
}

// Charts sit below the fold; load them in a separate chunk with a fixed-height placeholder to avoid layout shift.
const VitalsTrendChartsImpl = dynamic(
  () => import("@/components/VitalsTrendChartsImpl").then((m) => m.VitalsTrendCharts),
  {
    loading: () => <VitalsTrendsPlaceholder />,
  },
);

export function VitalsTrendCharts(props: VitalsTrendChartsProps) {
  return <VitalsTrendChartsImpl {...props} />;
}
