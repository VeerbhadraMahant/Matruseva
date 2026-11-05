"use client";

import { useMemo, useState } from "react";
import {
  Heartbeat,
  Drop,
  Scales,
  Ruler,
  Info,
  Warning,
  CheckCircle,
  WarningOctagon,
} from "@phosphor-icons/react";
import { formatShortDate, parseLocalDate } from "@/lib/format";
import { card } from "@/components/ui";
import { TrendChart, type TrendXMeta } from "@/components/charts/TrendChart";
import { gestationalAge, formatGALocalized } from "@/lib/pregnancy";
import { useLocale, useT } from "@/lib/i18n/provider";
import type { Translator } from "@/lib/i18n/translate-client";

export interface VisitDataPoint {
  id: string;
  visit_date: string;
  ga_weeks: number | null;
  bp_sys: number | null;
  bp_dia: number | null;
  weight: number | null;
  hb: number | null;
  fhr: number | null;
  fundal_height: number | null;
  notes: string | null;
}

interface VitalsTrendChartsProps {
  visits: VisitDataPoint[];
  lmp: string | null;
  edd: string | null;
  patientName: string;
}

type MetricTab = "bp" | "sfh" | "hb" | "weight_fhr";

interface ParsedVisit {
  id: string;
  date: string;
  parsedDate: Date;
  dateLabel: string;
  gaWeeks: number | null;
  gaLabel: string;
  bpSys: number | null;
  bpDia: number | null;
  map: number | null;
  sfh: number | null;
  hb: number | null;
  weight: number | null;
  fhr: number | null;
  notes: string | null;
}

export function VitalsTrendCharts({ visits, lmp, patientName }: VitalsTrendChartsProps) {
  const t = useT();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<MetricTab>("bp");

  // Chronological order (oldest to newest)
  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => a.visit_date.localeCompare(b.visit_date));
  }, [visits]);

  const parsedVisits: ParsedVisit[] = useMemo(() => {
    const lmpDate = lmp ? parseLocalDate(lmp) : null;
    return sortedVisits.map((v) => {
      const pDate = parseLocalDate(v.visit_date);
      let gaWeeks: number | null = null;
      let gaLabel = "—";

      if (lmpDate) {
        const ga = gestationalAge(lmpDate, pDate);
        gaWeeks = ga.weeks + ga.daysRemainder / 7;
        gaLabel = formatGALocalized(ga, t);
      } else if (v.ga_weeks !== null) {
        gaWeeks = Number(v.ga_weeks);
        gaLabel = t("clinical.ga.weeksShort", { weeks: Math.floor(gaWeeks) });
      }

      const map =
        v.bp_sys !== null && v.bp_dia !== null
          ? Math.round((v.bp_sys + 2 * v.bp_dia) / 3)
          : null;

      return {
        id: v.id,
        date: v.visit_date,
        parsedDate: pDate,
        dateLabel: formatShortDate(v.visit_date, locale),
        gaWeeks,
        gaLabel,
        bpSys: v.bp_sys,
        bpDia: v.bp_dia,
        map,
        sfh: v.fundal_height,
        hb: v.hb,
        weight: v.weight,
        fhr: v.fhr,
        notes: v.notes,
      };
    });
  }, [sortedVisits, lmp, t, locale]);

  // Metric-specific datasets
  const bpVisits = useMemo(() => parsedVisits.filter((v) => v.bpSys !== null && v.bpDia !== null), [parsedVisits]);
  const sfhVisits = useMemo(() => parsedVisits.filter((v) => v.sfh !== null && v.gaWeeks !== null), [parsedVisits]);
  const hbVisits = useMemo(() => parsedVisits.filter((v) => v.hb !== null), [parsedVisits]);
  const weightVisits = useMemo(() => parsedVisits.filter((v) => v.weight !== null), [parsedVisits]);
  const fhrVisits = useMemo(() => parsedVisits.filter((v) => v.fhr !== null), [parsedVisits]);

  // Derived summaries for quick header cards
  const bpSummary = useMemo(() => {
    if (bpVisits.length === 0) return null;
    const latest = bpVisits[bpVisits.length - 1];
    const baseline = bpVisits[0];
    const deltaDia = latest.bpDia! - baseline.bpDia!;
    const deltaSys = latest.bpSys! - baseline.bpSys!;
    const isHypertensive = latest.bpSys! >= 140 || latest.bpDia! >= 90;
    const isRapidRise = (deltaDia >= 15 || deltaSys >= 30) && bpVisits.length > 1;
    const isElevated = (latest.bpSys! >= 120 && latest.bpSys! < 140) || (latest.bpDia! >= 80 && latest.bpDia! < 90);

    let status = t("reports.charts.bpNormal");
    let tone: "ok" | "warning" | "critical" = "ok";
    if (isHypertensive) {
      status = t("reports.charts.bpStage1");
      tone = "critical";
    } else if (isRapidRise) {
      status = t("reports.charts.bpRiseAlert", { delta: deltaDia });
      tone = "warning";
    } else if (isElevated) {
      status = t("reports.charts.bpWatch");
      tone = "warning";
    }

    return { latest, baseline, deltaDia, deltaSys, status, tone };
  }, [bpVisits, t]);

  const sfhSummary = useMemo(() => {
    if (sfhVisits.length === 0) return null;
    const latest = sfhVisits[sfhVisits.length - 1];
    const diff = latest.sfh! - latest.gaWeeks!;
    let status = t("reports.charts.sfhOk");
    let tone: "ok" | "warning" | "critical" = "ok";

    if (diff < -2.5) {
      status = t("reports.charts.sfhLag");
      tone = "critical";
    } else if (diff > 2.5) {
      status = t("reports.charts.sfhFast");
      tone = "warning";
    }

    return { latest, diff, status, tone };
  }, [sfhVisits, t]);

  const hbSummary = useMemo(() => {
    if (hbVisits.length === 0) return null;
    const latest = hbVisits[hbVisits.length - 1];
    const baseline = hbVisits[0];
    const delta = Number((latest.hb! - baseline.hb!).toFixed(1));

    let status = t("reports.charts.hbNormal");
    let tone: "ok" | "warning" | "critical" = "ok";

    if (latest.hb! < 7.0) {
      status = t("reports.charts.hbSevere");
      tone = "critical";
    } else if (latest.hb! < 10.0) {
      status = t("reports.charts.hbModerate");
      tone = "warning";
    } else if (latest.hb! < 11.0) {
      status = t("reports.charts.hbMild");
      tone = "warning";
    }

    return { latest, baseline, delta, status, tone };
  }, [hbVisits, t]);

  const weightFhrSummary = useMemo(() => {
    const latestWeight = weightVisits[weightVisits.length - 1] ?? null;
    const baselineWeight = weightVisits[0] ?? null;
    const totalGain =
      latestWeight && baselineWeight ? Number((latestWeight.weight! - baselineWeight.weight!).toFixed(1)) : null;
    const latestFhr = fhrVisits[fhrVisits.length - 1] ?? null;
    const fhrAbnormal = latestFhr ? latestFhr.fhr! < 110 || latestFhr.fhr! > 160 : false;

    return {
      latestWeight: latestWeight?.weight ?? null,
      totalGain,
      latestFhr: latestFhr?.fhr ?? null,
      fhrAbnormal,
    };
  }, [weightVisits, fhrVisits]);

  return (
    <div className={`overflow-hidden ${card}`}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-foreground)] flex items-center gap-2">
            <span>{t("reports.charts.title")}</span>
            <span className="num font-normal text-[12px] text-[var(--color-charcoal)]">
              {t("reports.charts.visitsRecorded", { count: parsedVisits.length })}
            </span>
          </h2>
          <p className="text-[12px] text-[var(--color-charcoal)] mt-0.5">
            {t("reports.charts.subtitle")}
          </p>
        </div>
      </div>

      {/* KPI Overview Tabs */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-3 md:grid-cols-4">
        {/* Tab 1: Blood Pressure */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("bp");
          }}
          aria-pressed={activeTab === "bp"}
          className={`relative rounded-xl border p-3 text-left transition-colors ${
            activeTab === "bp"
              ? "border-[var(--color-primary)] bg-[var(--color-primary-surface)]/50 shadow-[0_0_0_1px_var(--color-primary)]"
              : "border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-[var(--color-primary)]"
          }`}
        >
          <div className="flex items-center justify-between text-[12px] font-medium text-[var(--color-charcoal)] mb-1">
            <span className="flex items-center gap-1.5">
              <Heartbeat size={15} className="text-[var(--color-info)]" aria-hidden />
              {t("reports.charts.tabBp")}
            </span>
            {bpSummary?.tone === "critical" && (
              <span className="h-2 w-2 rounded-full bg-[var(--color-overdue)]" />
            )}
            {bpSummary?.tone === "warning" && (
              <span className="h-2 w-2 rounded-full bg-[var(--color-due)]" />
            )}
          </div>
          <div className="num text-[17px] font-semibold text-[var(--color-foreground)]">
            {bpSummary ? `${bpSummary.latest.bpSys}/${bpSummary.latest.bpDia}` : "—"}
            <span className="text-[11px] font-normal text-[var(--color-charcoal)] ml-1">mmHg</span>
          </div>
          <p
            className={`text-[11px] mt-1 leading-snug ${
              bpSummary?.tone === "critical"
                ? "text-[var(--color-overdue)] font-medium"
                : bpSummary?.tone === "warning"
                ? "text-[var(--color-due)] font-medium"
                : "text-[var(--color-on-track)] font-medium"
            }`}
          >
            {bpSummary ? bpSummary.status : t("reports.charts.noBp")}
          </p>
        </button>

        {/* Tab 2: Fundal Height vs GA */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("sfh");
          }}
          aria-pressed={activeTab === "sfh"}
          className={`relative rounded-xl border p-3 text-left transition-colors ${
            activeTab === "sfh"
              ? "border-[var(--color-primary)] bg-[var(--color-primary-surface)]/50 shadow-[0_0_0_1px_var(--color-primary)]"
              : "border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-[var(--color-primary)]"
          }`}
        >
          <div className="flex items-center justify-between text-[12px] font-medium text-[var(--color-charcoal)] mb-1">
            <span className="flex items-center gap-1.5">
              <Ruler size={15} className="text-[var(--color-on-track)]" aria-hidden />
              {t("reports.charts.tabSfh")}
            </span>
            {sfhSummary?.tone === "critical" && (
              <span className="h-2 w-2 rounded-full bg-[var(--color-overdue)]" />
            )}
            {sfhSummary?.tone === "warning" && (
              <span className="h-2 w-2 rounded-full bg-[var(--color-due)]" />
            )}
          </div>
          <div className="num text-[17px] font-semibold text-[var(--color-foreground)]">
            {sfhSummary ? `${sfhSummary.latest.sfh} cm` : "—"}
            {sfhSummary && (
              <span className="text-[11px] font-normal text-[var(--color-charcoal)] ml-1.5">
                {t("reports.charts.sfhAt", { ga: sfhSummary.latest.gaLabel })}
              </span>
            )}
          </div>
          <p
            className={`text-[11px] mt-1 leading-snug ${
              sfhSummary?.tone === "critical"
                ? "text-[var(--color-overdue)] font-medium"
                : sfhSummary?.tone === "warning"
                ? "text-[var(--color-due)] font-medium"
                : "text-[var(--color-on-track)] font-medium"
            }`}
          >
            {sfhSummary ? sfhSummary.status : t("reports.charts.noSfh")}
          </p>
        </button>

        {/* Tab 3: Hemoglobin */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("hb");
          }}
          aria-pressed={activeTab === "hb"}
          className={`relative rounded-xl border p-3 text-left transition-colors ${
            activeTab === "hb"
              ? "border-[var(--color-primary)] bg-[var(--color-primary-surface)]/50 shadow-[0_0_0_1px_var(--color-primary)]"
              : "border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-[var(--color-primary)]"
          }`}
        >
          <div className="flex items-center justify-between text-[12px] font-medium text-[var(--color-charcoal)] mb-1">
            <span className="flex items-center gap-1.5">
              <Drop size={15} className="text-[var(--color-overdue)]" aria-hidden />
              {t("reports.charts.tabHb")}
            </span>
            {hbSummary?.tone === "critical" && (
              <span className="h-2 w-2 rounded-full bg-[var(--color-overdue)]" />
            )}
            {hbSummary?.tone === "warning" && (
              <span className="h-2 w-2 rounded-full bg-[var(--color-due)]" />
            )}
          </div>
          <div className="num text-[17px] font-semibold text-[var(--color-foreground)]">
            {hbSummary ? `${hbSummary.latest.hb}` : "—"}
            <span className="text-[11px] font-normal text-[var(--color-charcoal)] ml-1">g/dL</span>
            {hbSummary && hbVisits.length > 1 && (
              <span
                className={`text-[12px] font-normal ml-2 ${
                  hbSummary.delta >= 0 ? "text-[var(--color-on-track)]" : "text-[var(--color-overdue)]"
                }`}
              >
                {hbSummary.delta >= 0 ? `+${hbSummary.delta}` : hbSummary.delta}
              </span>
            )}
          </div>
          <p
            className={`text-[11px] mt-1 leading-snug ${
              hbSummary?.tone === "critical"
                ? "text-[var(--color-overdue)] font-medium"
                : hbSummary?.tone === "warning"
                ? "text-[var(--color-due)] font-medium"
                : "text-[var(--color-on-track)] font-medium"
            }`}
          >
            {hbSummary ? hbSummary.status : t("reports.charts.noHb")}
          </p>
        </button>

        {/* Tab 4: Weight & FHR */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("weight_fhr");
          }}
          aria-pressed={activeTab === "weight_fhr"}
          className={`relative rounded-xl border p-3 text-left transition-colors ${
            activeTab === "weight_fhr"
              ? "border-[var(--color-primary)] bg-[var(--color-primary-surface)]/50 shadow-[0_0_0_1px_var(--color-primary)]"
              : "border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-[var(--color-primary)]"
          }`}
        >
          <div className="flex items-center justify-between text-[12px] font-medium text-[var(--color-charcoal)] mb-1">
            <span className="flex items-center gap-1.5">
              <Scales size={15} className="text-[var(--color-charcoal)]" aria-hidden />
              {t("reports.charts.tabWeightFhr")}
            </span>
            {weightFhrSummary.fhrAbnormal && (
              <span className="h-2 w-2 rounded-full bg-[var(--color-overdue)]" />
            )}
          </div>
          <div className="num text-[17px] font-semibold text-[var(--color-foreground)] flex items-baseline gap-2">
            <span>{weightFhrSummary.latestWeight ? `${weightFhrSummary.latestWeight} kg` : "—"}</span>
            {weightFhrSummary.totalGain !== null && (
              <span className="text-[12px] font-normal text-[var(--color-charcoal)]">
                ({weightFhrSummary.totalGain >= 0 ? `+${weightFhrSummary.totalGain}` : weightFhrSummary.totalGain} kg)
              </span>
            )}
          </div>
          <p className="num text-[11px] mt-1 leading-snug text-[var(--color-charcoal)]">
            {weightFhrSummary.latestFhr ? t("reports.charts.fhrLine", { fhr: weightFhrSummary.latestFhr }) : t("reports.charts.noFhr")}
          </p>
        </button>
      </div>

      {/* Main Interactive Graph Area */}
      <div className="px-4 pb-4 pt-2">
        {activeTab === "bp" && (
          <BpChart
            visits={bpVisits}
          />
        )}
        {activeTab === "sfh" && (
          <SfhChart
            visits={sfhVisits}
            patientName={patientName}
          />
        )}
        {activeTab === "hb" && (
          <HbChart
            visits={hbVisits}
          />
        )}
        {activeTab === "weight_fhr" && (
          <WeightFhrChart
            weightVisits={weightVisits}
            fhrVisits={fhrVisits}
          />
        )}
      </div>
    </div>
  );
}

const CHART_1 = "var(--color-pc-chart-1)";
const CHART_2 = "var(--color-pc-chart-2)";

/**
 * x-axis for a set of visits: gestational weeks when every visit has a GA
 * (so spacing reflects real time), otherwise plain visit order by date.
 */
function gaAxis(visits: ParsedVisit[], t: Translator, preferred?: [number, number]) {
  const isGa = visits.length > 0 && visits.every((v) => v.gaWeeks !== null);
  const byX = new Map<number, ParsedVisit>();
  const x = (v: ParsedVisit, i: number) => (isGa ? Math.round(v.gaWeeks! * 7) / 7 : i);
  visits.forEach((v, i) => byX.set(x(v, i), v));
  const meta = (xv: number): TrendXMeta => {
    const v = byX.get(xv);
    return v ? { title: v.dateLabel, sub: v.gaLabel !== "—" ? t("clinical.ga.atGa", { ga: v.gaLabel }) : undefined } : { title: "" };
  };

  if (!isGa) {
    const n = Math.max(1, visits.length);
    return {
      isGa,
      x,
      meta,
      domain: [-0.5, n - 0.5] as [number, number],
      ticks: visits.map((_, i) => i),
      tickLabel: (tick: number) => visits[tick]?.dateLabel ?? "",
    };
  }

  const gas = visits.map((v) => v.gaWeeks!);
  let lo = Math.max(4, Math.floor((Math.min(...gas) - 2) / 2) * 2);
  let hi = Math.min(42, Math.ceil((Math.max(...gas) + 2) / 2) * 2);
  if (preferred) {
    lo = Math.min(lo, preferred[0]);
    hi = Math.max(hi, preferred[1]);
  }
  if (hi - lo < 8) hi = Math.min(42, lo + 8);
  if (hi - lo < 8) lo = hi - 8;
  const step = hi - lo > 16 ? 4 : 2;
  const ticks: number[] = [];
  for (let tick = Math.ceil(lo / step) * step; tick <= hi; tick += step) ticks.push(tick);
  return { isGa, x, meta, domain: [lo, hi] as [number, number], ticks, tickLabel: (tick: number) => t("clinical.ga.weeksShort", { weeks: tick }) };
}

/* =========================================================================
   1. Blood Pressure Trajectory Chart
   ========================================================================= */

function BpChart({
  visits,
}: {
  visits: ParsedVisit[];
}) {
  const t = useT();
  if (visits.length === 0) {
    return (
      <EmptyChartState
        title={t("reports.charts.emptyBpTitle")}
        message={t("reports.charts.emptyBpBody")}
      />
    );
  }

  // Clinical alerts calculation
  const latest = visits[visits.length - 1];
  const baseline = visits[0];
  const deltaDia = latest.bpDia! - baseline.bpDia!;
  const deltaSys = latest.bpSys! - baseline.bpSys!;
  const isRapidRise = (deltaDia >= 15 || deltaSys >= 30) && visits.length > 1;


  return (
    <div className="space-y-3">
      {(() => {
        const axis = gaAxis(visits, t);
        const sys = visits.map((v) => v.bpSys!);
        const dia = visits.map((v) => v.bpDia!);
        return (
          <TrendChart
            ariaLabel={t("reports.charts.bpAria")}
            unit="mmHg"
            series={[
              { key: "sys", label: t("reports.charts.systolic"), color: CHART_1, points: visits.map((v, i) => ({ x: axis.x(v, i), y: v.bpSys! })) },
              { key: "dia", label: t("reports.charts.diastolic"), color: CHART_2, points: visits.map((v, i) => ({ x: axis.x(v, i), y: v.bpDia! })) },
            ]}
            refLines={[
              { y: 140, label: t("reports.charts.htnThreshold") },
              { y: 90, label: t("reports.charts.htnThreshold") },
            ]}
            yDomain={[Math.min(50, Math.floor((Math.min(...dia) - 10) / 10) * 10), Math.max(170, Math.ceil((Math.max(...sys) + 10) / 10) * 10)]}
            xDomain={axis.domain}
            xTicks={axis.ticks}
            xTickLabel={axis.tickLabel}
            xMeta={axis.meta}
          />
        );
      })()}

      {/* Clinical Guidance Interpretation Box */}
      <div className="rounded-xl p-3 border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[12px] leading-relaxed">
        <div className="flex items-start gap-2">
          {isRapidRise || latest.bpSys! >= 140 || latest.bpDia! >= 90 ? (
            <Warning size={16} className="text-[var(--color-overdue)] shrink-0 mt-0.5" />
          ) : (
            <CheckCircle size={16} className="text-[var(--color-on-track)] shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-semibold text-[var(--color-foreground)]">
              {latest.bpSys! >= 140 || latest.bpDia! >= 90
                ? t("reports.charts.bpHtnTitle")
                : isRapidRise
                ? t("reports.charts.bpRiseTitle")
                : t("reports.charts.bpOkTitle")}
            </p>
            <p className="text-[var(--color-charcoal)]">
              {isRapidRise
                ? t("reports.charts.bpRiseBody", { delta: deltaDia, from: baseline.bpDia!, to: latest.bpDia! })
                : latest.bpSys! >= 140 || latest.bpDia! >= 90
                ? t("reports.charts.bpHtnBody")
                : t("reports.charts.bpOkBody", { sys: latest.bpSys!, dia: latest.bpDia! })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. Symphysio-Fundal Height (SFH) vs GA Chart (McDonald's Rule / WHO)
   ========================================================================= */

function SfhChart({
  visits,
  patientName,
}: {
  visits: ParsedVisit[];
  patientName: string;
}) {
  const t = useT();
  if (visits.length === 0) {
    return (
      <EmptyChartState
        title={t("reports.charts.emptySfhTitle")}
        message={t("reports.charts.emptySfhBody")}
      />
    );
  }

  const latest = visits[visits.length - 1];
  const diff = latest.sfh! - latest.gaWeeks!;
  const isIugr = diff < -2.5;
  const isMacrosomia = diff > 2.5;


  return (
    <div className="space-y-3">
      {(() => {
        const axis = gaAxis(visits, t, [16, 40]);
        const values = visits.map((v) => v.sfh!);
        return (
          <TrendChart
            ariaLabel={t("reports.charts.sfhAria", { name: patientName })}
            unit="cm"
            series={[{ key: "sfh", label: t("reports.charts.fundalHeight"), color: CHART_1, points: visits.map((v, i) => ({ x: axis.x(v, i), y: v.sfh! })) }]}
            corridor={
              axis.isGa
                ? { lower: (x) => x - 2.5, upper: (x) => x + 2.5, mid: (x) => x, label: t("reports.charts.sfhCorridor") }
                : undefined
            }
            yDomain={[
              Math.floor(Math.min(axis.domain[0] - 4, ...values) / 2) * 2,
              Math.ceil(Math.max(axis.domain[1] + 4, ...values) / 2) * 2,
            ]}
            xDomain={axis.domain}
            xTicks={axis.ticks}
            xTickLabel={axis.tickLabel}
            xMeta={axis.meta}
          />
        );
      })()}

      {/* Clinical Guidance Interpretation Box */}
      <div className="rounded-xl p-3 border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[12px] leading-relaxed">
        <div className="flex items-start gap-2">
          {isIugr ? (
            <Warning size={16} className="text-[var(--color-overdue)] shrink-0 mt-0.5" />
          ) : isMacrosomia ? (
            <Warning size={16} className="text-[var(--color-due)] shrink-0 mt-0.5" />
          ) : (
            <CheckCircle size={16} className="text-[var(--color-on-track)] shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-semibold text-[var(--color-foreground)]">
              {isIugr
                ? t("reports.charts.sfhLagTitle")
                : isMacrosomia
                ? t("reports.charts.sfhFastTitle")
                : t("reports.charts.sfhOkTitle")}
            </p>
            <p className="text-[var(--color-charcoal)]">
              {isIugr
                ? t("reports.charts.sfhLagBody", { sfh: latest.sfh!, ga: latest.gaLabel, diff: Math.abs(diff).toFixed(1) })
                : isMacrosomia
                ? t("reports.charts.sfhFastBody", { diff: diff.toFixed(1) })
                : t("reports.charts.sfhOkBody")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. Hemoglobin (Hb) Trend & Anemia Response Chart
   ========================================================================= */

function HbChart({
  visits,
}: {
  visits: ParsedVisit[];
}) {
  const t = useT();
  if (visits.length === 0) {
    return (
      <EmptyChartState
        title={t("reports.charts.emptyHbTitle")}
        message={t("reports.charts.emptyHbBody")}
      />
    );
  }

  const latest = visits[visits.length - 1];
  const baseline = visits[0];
  const delta = Number((latest.hb! - baseline.hb!).toFixed(1));
  const isAnemic = latest.hb! < 11.0;
  const isSevere = latest.hb! < 7.0;


  return (
    <div className="space-y-3">
      {(() => {
        const axis = gaAxis(visits, t);
        const values = visits.map((v) => v.hb!);
        return (
          <TrendChart
            ariaLabel={t("reports.charts.hbAria")}
            unit="g/dL"
            decimals={1}
            series={[{ key: "hb", label: t("reports.charts.haemoglobin"), color: CHART_1, points: visits.map((v, i) => ({ x: axis.x(v, i), y: v.hb! })) }]}
            bands={[
              { from: 11, to: 20, label: t("reports.charts.bandNormal"), tone: "ok" },
              { from: 10, to: 11, label: t("reports.charts.bandMild"), tone: "warn" },
              { from: 0, to: 10, label: t("reports.charts.bandModSevere"), tone: "bad" },
            ]}
            yDomain={[Math.min(6, Math.floor(Math.min(...values) - 1)), Math.max(14, Math.ceil(Math.max(...values) + 1))]}
            xDomain={axis.domain}
            xTicks={axis.ticks}
            xTickLabel={axis.tickLabel}
            xMeta={axis.meta}
          />
        );
      })()}

      {/* Clinical Guidance Interpretation Box */}
      <div className="rounded-xl p-3 border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[12px] leading-relaxed">
        <div className="flex items-start gap-2">
          {isSevere ? (
            <WarningOctagon size={16} className="text-[var(--color-overdue)] shrink-0 mt-0.5" />
          ) : isAnemic ? (
            <Warning size={16} className="text-[var(--color-due)] shrink-0 mt-0.5" />
          ) : (
            <CheckCircle size={16} className="text-[var(--color-on-track)] shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-semibold text-[var(--color-foreground)]">
              {isSevere
                ? t("reports.charts.hbSevereTitle")
                : isAnemic
                ? t("reports.charts.hbAnaemicTitle", { hb: latest.hb! })
                : t("reports.charts.hbOkTitle")}
            </p>
            <p className="text-[var(--color-charcoal)]">
              {isSevere
                ? t("reports.charts.hbSevereBody", { hb: latest.hb! })
                : isAnemic
                ? `${t("reports.charts.hbAnaemicHead", { hb: latest.hb! })} ${
                    delta < 0
                      ? t("reports.charts.hbDropped", { delta: Math.abs(delta) })
                      : t("reports.charts.hbImproved", { delta })
                  }`
                : t("reports.charts.hbOkBody", { hb: latest.hb! })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   4. Maternal Weight Gain & FHR Stability Chart
   ========================================================================= */

function WeightFhrChart({
  weightVisits,
  fhrVisits,
}: {
  weightVisits: ParsedVisit[];
  fhrVisits: ParsedVisit[];
}) {
  const t = useT();
  if (weightVisits.length === 0 && fhrVisits.length === 0) {
    return (
      <EmptyChartState
        title={t("reports.charts.emptyWfTitle")}
        message={t("reports.charts.emptyWfBody")}
      />
    );
  }

  const latestWeight = weightVisits[weightVisits.length - 1] ?? null;
  const baselineWeight = weightVisits[0] ?? null;
  const totalGain =
    latestWeight && baselineWeight ? Number((latestWeight.weight! - baselineWeight.weight!).toFixed(1)) : null;

  const latestFhr = fhrVisits[fhrVisits.length - 1] ?? null;


  return (
    <div className="space-y-3">
      {/* Two small charts, one scale each (never a dual-axis chart). */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <section aria-label={t("reports.charts.weightSection")}>
          <h3 className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-[13px] font-semibold">
            {t("reports.charts.weightSection")}
            <span className="text-[12px] font-normal text-[var(--color-charcoal)]">
              {t("reports.charts.totalGain")}{" "}
              <strong className="tabular-nums text-[var(--color-foreground)]">
                {totalGain !== null ? `${totalGain > 0 ? "+" : ""}${totalGain} kg` : "—"}
              </strong>
            </span>
          </h3>
          {weightVisits.length === 0 ? (
            <p className="rounded-xl bg-[var(--color-surface-1)] px-4 py-8 text-center text-[13px] text-[var(--color-charcoal)]">{t("reports.charts.noWeightYet")}</p>
          ) : (
            (() => {
              const axis = gaAxis(weightVisits, t);
              const values = weightVisits.map((v) => v.weight!);
              return (
                <TrendChart
                  ariaLabel={t("reports.charts.weightAria")}
                  unit="kg"
                  decimals={1}
                  series={[{ key: "wt", label: t("reports.charts.weightSeries"), color: CHART_1, points: weightVisits.map((v, i) => ({ x: axis.x(v, i), y: v.weight! })) }]}
                  yDomain={[Math.floor(Math.min(...values) - 3), Math.ceil(Math.max(...values) + 3)]}
                  xDomain={axis.domain}
                  xTicks={axis.ticks}
                  xTickLabel={axis.tickLabel}
                  xMeta={axis.meta}
                />
              );
            })()
          )}
        </section>
        <section aria-label={t("reports.charts.fhrSection")}>
          <h3 className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-[13px] font-semibold">
            {t("reports.charts.fhrSection")}
            <span className="text-[12px] font-normal text-[var(--color-charcoal)]">
              {t("reports.charts.latest")}{" "}
              <strong
                className={`tabular-nums ${
                  latestFhr && (latestFhr.fhr! < 110 || latestFhr.fhr! > 160) ? "text-[var(--color-overdue)]" : "text-[var(--color-foreground)]"
                }`}
              >
                {latestFhr ? `${latestFhr.fhr} bpm` : "—"}
              </strong>
            </span>
          </h3>
          {fhrVisits.length === 0 ? (
            <p className="rounded-xl bg-[var(--color-surface-1)] px-4 py-8 text-center text-[13px] text-[var(--color-charcoal)]">{t("reports.charts.noFhrYet")}</p>
          ) : (
            (() => {
              const axis = gaAxis(fhrVisits, t);
              const values = fhrVisits.map((v) => v.fhr!);
              return (
                <TrendChart
                  ariaLabel={t("reports.charts.fhrAria")}
                  unit="bpm"
                  series={[{ key: "fhr", label: t("reports.charts.fhrSeries"), color: CHART_1, points: fhrVisits.map((v, i) => ({ x: axis.x(v, i), y: v.fhr! })) }]}
                  bands={[{ from: 110, to: 160, label: t("reports.charts.fhrBand"), tone: "ok" }]}
                  yDomain={[Math.min(90, Math.floor(Math.min(...values) / 10) * 10 - 10), Math.max(180, Math.ceil(Math.max(...values) / 10) * 10 + 10)]}
                  xDomain={axis.domain}
                  xTicks={axis.ticks}
                  xTickLabel={axis.tickLabel}
                  xMeta={axis.meta}
                />
              );
            })()
          )}
        </section>
      </div>

      {/* Clinical Guidance Interpretation Box */}
      <div className="rounded-xl p-3 border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[12px] leading-relaxed">
        <div className="flex items-start gap-2">
          <CheckCircle size={16} className="text-[var(--color-on-track)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[var(--color-foreground)]">{t("reports.charts.wfTitle")}</p>
            <p className="text-[var(--color-charcoal)]">
              {totalGain !== null ? t("reports.charts.wfBody", { gain: totalGain }) : t("reports.charts.wfNone")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Empty Chart State
   ========================================================================= */

function EmptyChartState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl p-8 text-center border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-1)]">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-charcoal)] mb-2">
        <Info size={20} aria-hidden />
      </div>
      <p className="text-[14px] font-medium text-[var(--color-foreground)]">{title}</p>
      <p className="mt-1 text-[12px] text-[var(--color-charcoal)] max-w-md mx-auto">{message}</p>
    </div>
  );
}
