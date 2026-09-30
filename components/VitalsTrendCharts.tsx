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
  ArrowUp,
  ArrowDown,
} from "@phosphor-icons/react";
import { formatShortDate, parseLocalDate } from "@/lib/format";
import { gestationalAge, formatGA } from "@/lib/pregnancy";

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

export function VitalsTrendCharts({ visits, lmp, edd, patientName }: VitalsTrendChartsProps) {
  const [activeTab, setActiveTab] = useState<MetricTab>("bp");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
        gaLabel = formatGA(ga);
      } else if (v.ga_weeks !== null) {
        gaWeeks = Number(v.ga_weeks);
        gaLabel = `${Math.floor(gaWeeks)}w`;
      }

      const map =
        v.bp_sys !== null && v.bp_dia !== null
          ? Math.round((v.bp_sys + 2 * v.bp_dia) / 3)
          : null;

      return {
        id: v.id,
        date: v.visit_date,
        parsedDate: pDate,
        dateLabel: formatShortDate(v.visit_date),
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
  }, [sortedVisits, lmp]);

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

    let status = "Normotensive";
    let tone: "ok" | "warning" | "critical" = "ok";
    if (isHypertensive) {
      status = "Stage 1 HTN (≥140/90)";
      tone = "critical";
    } else if (isRapidRise) {
      status = `Pre-eclampsia alert (+${deltaDia} mmHg Dia)`;
      tone = "warning";
    } else if (isElevated) {
      status = "Pre-hypertension / Watch";
      tone = "warning";
    }

    return { latest, baseline, deltaDia, deltaSys, status, tone };
  }, [bpVisits]);

  const sfhSummary = useMemo(() => {
    if (sfhVisits.length === 0) return null;
    const latest = sfhVisits[sfhVisits.length - 1];
    const diff = latest.sfh! - latest.gaWeeks!;
    let status = "Appropriate for GA";
    let tone: "ok" | "warning" | "critical" = "ok";

    if (diff < -2.5) {
      status = "Lagging (<10th centile / Suspect IUGR)";
      tone = "critical";
    } else if (diff > 2.5) {
      status = "Accelerated (>90th centile / Macrosomia)";
      tone = "warning";
    }

    return { latest, diff, status, tone };
  }, [sfhVisits]);

  const hbSummary = useMemo(() => {
    if (hbVisits.length === 0) return null;
    const latest = hbVisits[hbVisits.length - 1];
    const baseline = hbVisits[0];
    const delta = Number((latest.hb! - baseline.hb!).toFixed(1));

    let status = "Normal (≥11.0 g/dL)";
    let tone: "ok" | "warning" | "critical" = "ok";

    if (latest.hb! < 7.0) {
      status = "Severe Anemia (<7.0 g/dL)";
      tone = "critical";
    } else if (latest.hb! < 10.0) {
      status = "Moderate Anemia (7.0–9.9 g/dL)";
      tone = "warning";
    } else if (latest.hb! < 11.0) {
      status = "Mild Anemia (10.0–10.9 g/dL)";
      tone = "warning";
    }

    return { latest, baseline, delta, status, tone };
  }, [hbVisits]);

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
    <div className="border border-[var(--color-border)] bg-[var(--color-background)]">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface-1)]">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--color-foreground)] flex items-center gap-2">
            <span>Antenatal Vitals & Partograph Trajectory</span>
            <span className="num font-normal text-[12px] text-[var(--color-charcoal)]">
              ({parsedVisits.length} {parsedVisits.length === 1 ? "visit" : "visits"} recorded)
            </span>
          </h2>
          <p className="text-[12px] text-[var(--color-charcoal)] mt-0.5">
            Clinical trend monitoring for early detection of pre-eclampsia, fetal growth restriction (IUGR), and gestational anemia.
          </p>
        </div>
      </div>

      {/* KPI Overview Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[var(--color-border)] bg-[var(--color-surface-1)] divide-x divide-y md:divide-y-0 divide-[var(--color-border)]">
        {/* Tab 1: Blood Pressure */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("bp");
            setHoveredIndex(null);
          }}
          className={`p-3 text-left transition-colors relative ${
            activeTab === "bp" ? "bg-[var(--color-background)]" : "hover:bg-[var(--color-surface-2)]"
          }`}
        >
          {activeTab === "bp" && (
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--color-primary)]" />
          )}
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)] mb-1">
            <span className="flex items-center gap-1.5">
              <Heartbeat size={15} className="text-[var(--color-info)]" aria-hidden />
              Blood Pressure
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
            className={`text-[11px] mt-1 truncate ${
              bpSummary?.tone === "critical"
                ? "text-[var(--color-overdue)] font-medium"
                : bpSummary?.tone === "warning"
                ? "text-[var(--color-due)] font-medium"
                : "text-[var(--color-on-track)] font-medium"
            }`}
          >
            {bpSummary ? bpSummary.status : "No BP recorded"}
          </p>
        </button>

        {/* Tab 2: Fundal Height vs GA */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("sfh");
            setHoveredIndex(null);
          }}
          className={`p-3 text-left transition-colors relative ${
            activeTab === "sfh" ? "bg-[var(--color-background)]" : "hover:bg-[var(--color-surface-2)]"
          }`}
        >
          {activeTab === "sfh" && (
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--color-primary)]" />
          )}
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)] mb-1">
            <span className="flex items-center gap-1.5">
              <Ruler size={15} className="text-[var(--color-on-track)]" aria-hidden />
              Fundal Ht (SFH)
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
                at {sfhSummary.latest.gaLabel}
              </span>
            )}
          </div>
          <p
            className={`text-[11px] mt-1 truncate ${
              sfhSummary?.tone === "critical"
                ? "text-[var(--color-overdue)] font-medium"
                : sfhSummary?.tone === "warning"
                ? "text-[var(--color-due)] font-medium"
                : "text-[var(--color-on-track)] font-medium"
            }`}
          >
            {sfhSummary ? sfhSummary.status : "No SFH recorded"}
          </p>
        </button>

        {/* Tab 3: Hemoglobin */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("hb");
            setHoveredIndex(null);
          }}
          className={`p-3 text-left transition-colors relative ${
            activeTab === "hb" ? "bg-[var(--color-background)]" : "hover:bg-[var(--color-surface-2)]"
          }`}
        >
          {activeTab === "hb" && (
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--color-primary)]" />
          )}
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)] mb-1">
            <span className="flex items-center gap-1.5">
              <Drop size={15} className="text-[var(--color-overdue)]" aria-hidden />
              Hemoglobin (Hb)
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
            className={`text-[11px] mt-1 truncate ${
              hbSummary?.tone === "critical"
                ? "text-[var(--color-overdue)] font-medium"
                : hbSummary?.tone === "warning"
                ? "text-[var(--color-due)] font-medium"
                : "text-[var(--color-on-track)] font-medium"
            }`}
          >
            {hbSummary ? hbSummary.status : "No Hb recorded"}
          </p>
        </button>

        {/* Tab 4: Weight & FHR */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("weight_fhr");
            setHoveredIndex(null);
          }}
          className={`p-3 text-left transition-colors relative ${
            activeTab === "weight_fhr" ? "bg-[var(--color-background)]" : "hover:bg-[var(--color-surface-2)]"
          }`}
        >
          {activeTab === "weight_fhr" && (
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--color-primary)]" />
          )}
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)] mb-1">
            <span className="flex items-center gap-1.5">
              <Scales size={15} className="text-[var(--color-charcoal)]" aria-hidden />
              Weight & FHR
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
          <p className="num text-[11px] mt-1 truncate text-[var(--color-charcoal)]">
            {weightFhrSummary.latestFhr ? `FHR ${weightFhrSummary.latestFhr} bpm (110–160 normal)` : "No FHR recorded"}
          </p>
        </button>
      </div>

      {/* Main Interactive Graph Area */}
      <div className="p-4 bg-[var(--color-background)]">
        {activeTab === "bp" && (
          <BpChart
            visits={bpVisits}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
            patientName={patientName}
          />
        )}
        {activeTab === "sfh" && (
          <SfhChart
            visits={sfhVisits}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
            patientName={patientName}
          />
        )}
        {activeTab === "hb" && (
          <HbChart
            visits={hbVisits}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
            patientName={patientName}
          />
        )}
        {activeTab === "weight_fhr" && (
          <WeightFhrChart
            weightVisits={weightVisits}
            fhrVisits={fhrVisits}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
            patientName={patientName}
          />
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   1. Blood Pressure Trajectory Chart
   ========================================================================= */

function BpChart({
  visits,
  hoveredIndex,
  onHover,
  patientName,
}: {
  visits: ParsedVisit[];
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
  patientName: string;
}) {
  if (visits.length === 0) {
    return (
      <EmptyChartState
        title="No Blood Pressure recorded"
        message="Record BP readings during OPD visits to monitor trajectory for early signs of gestational hypertension or pre-eclampsia."
      />
    );
  }

  // Chart Dimensions
  const W = 680;
  const H = 240;
  const P = { top: 25, right: 35, bottom: 35, left: 45 };
  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;

  // Scale: BP from 50 to 180 mmHg
  const minBP = 50;
  const maxBP = 180;
  const getY = (val: number) => P.top + innerH - ((val - minBP) / (maxBP - minBP)) * innerH;

  // X Scale: evenly distribute points or spaced by date
  const getX = (index: number) => {
    if (visits.length === 1) return P.left + innerW / 2;
    return P.left + (index / (visits.length - 1)) * innerW;
  };

  // Generate SVG path for Systolic and Diastolic
  const sysPoints = visits.map((v, i) => `${getX(i)},${getY(v.bpSys!)}`);
  const diaPoints = visits.map((v, i) => `${getX(i)},${getY(v.bpDia!)}`);
  const sysPath = sysPoints.length > 1 ? `M ${sysPoints.join(" L ")}` : "";
  const diaPath = diaPoints.length > 1 ? `M ${diaPoints.join(" L ")}` : "";

  // Shaded area between Systolic and Diastolic
  const areaPoints = [
    ...sysPoints,
    ...visits.map((_, i) => `${getX(visits.length - 1 - i)},${getY(visits[visits.length - 1 - i].bpDia!)}`),
  ];
  const pulseAreaPath = areaPoints.length > 2 ? `M ${areaPoints.join(" L ")} Z` : "";

  // Clinical alerts calculation
  const latest = visits[visits.length - 1];
  const baseline = visits[0];
  const deltaDia = latest.bpDia! - baseline.bpDia!;
  const deltaSys = latest.bpSys! - baseline.bpSys!;
  const isRapidRise = (deltaDia >= 15 || deltaSys >= 30) && visits.length > 1;

  const activePoint = hoveredIndex !== null && visits[hoveredIndex] ? visits[hoveredIndex] : null;

  return (
    <div className="space-y-3">
      {/* Chart Legend & Thresholds */}
      <div className="flex flex-wrap items-center justify-between text-[12px] gap-2 pb-1 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-info)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-info)]" /> Systolic
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-on-track)]">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-on-track)]" /> Diastolic
          </span>
          <span className="text-[var(--color-charcoal)] hidden sm:inline">
            Shaded band = Pulse Pressure
          </span>
        </div>
        <div className="flex items-center gap-3 num text-[11px] text-[var(--color-charcoal)]">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 border-t-2 border-dashed border-[var(--color-overdue)]" />
            140/90 HTN Threshold
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[540px] select-none"
          style={{ maxHeight: "250px" }}
        >
          {/* Background HTN Alert Zone (Sys >= 140 or Dia >= 90) */}
          <rect
            x={P.left}
            y={P.top}
            width={innerW}
            height={getY(140) - P.top}
            fill="var(--color-overdue-surface)"
            opacity={0.4}
          />

          {/* Grid lines and Y-axis labels */}
          {[60, 80, 90, 100, 120, 140, 160].map((val) => {
            const y = getY(val);
            const isThreshold = val === 140 || val === 90;
            return (
              <g key={val}>
                <line
                  x1={P.left}
                  y1={y}
                  x2={P.left + innerW}
                  y2={y}
                  stroke={isThreshold ? "var(--color-overdue)" : "var(--color-border)"}
                  strokeWidth={isThreshold ? 1.2 : 0.8}
                  strokeDasharray={isThreshold ? "4 4" : "2 2"}
                />
                <text
                  x={P.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className={`num text-[10px] ${
                    isThreshold ? "fill-[var(--color-overdue)] font-semibold" : "fill-[var(--color-charcoal)]"
                  }`}
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Pulse pressure area */}
          {pulseAreaPath && (
            <path d={pulseAreaPath} fill="var(--color-info-surface)" opacity={0.5} />
          )}

          {/* Systolic Line */}
          {sysPath && (
            <path
              d={sysPath}
              fill="none"
              stroke="var(--color-info)"
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Diastolic Line */}
          {diaPath && (
            <path
              d={diaPath}
              fill="none"
              stroke="var(--color-on-track)"
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Data Points */}
          {visits.map((v, i) => {
            const x = getX(i);
            const ySys = getY(v.bpSys!);
            const yDia = getY(v.bpDia!);
            const isHovered = hoveredIndex === i;

            return (
              <g key={v.id} className="cursor-pointer" onMouseEnter={() => onHover(i)}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={P.top}
                    x2={x}
                    y2={P.top + innerH}
                    stroke="var(--color-foreground)"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                )}

                {/* Systolic point */}
                <circle
                  cx={x}
                  cy={ySys}
                  r={isHovered ? 6 : 4}
                  fill="var(--color-background)"
                  stroke="var(--color-info)"
                  strokeWidth={2.5}
                />

                {/* Diastolic point */}
                <rect
                  x={x - (isHovered ? 5 : 3.5)}
                  y={yDia - (isHovered ? 5 : 3.5)}
                  width={isHovered ? 10 : 7}
                  height={isHovered ? 10 : 7}
                  fill="var(--color-background)"
                  stroke="var(--color-on-track)"
                  strokeWidth={2.5}
                />

                {/* X-axis date / GA label */}
                <text
                  x={x}
                  y={P.top + innerH + 16}
                  textAnchor="middle"
                  className="num text-[10px] fill-[var(--color-foreground)] font-medium"
                >
                  {v.gaLabel}
                </text>
                <text
                  x={x}
                  y={P.top + innerH + 28}
                  textAnchor="middle"
                  className="num text-[9px] fill-[var(--color-charcoal)]"
                >
                  {v.dateLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {activePoint && hoveredIndex !== null && (
          <div
            className="absolute top-2 right-2 bg-[var(--color-background)] border border-[var(--color-border-strong)] p-2.5 shadow-sm text-[12px] z-10 max-w-xs animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-1 mb-1.5">
              <span className="font-semibold text-[var(--color-foreground)]">{activePoint.dateLabel}</span>
              <span className="num text-[var(--color-charcoal)] font-medium">{activePoint.gaLabel}</span>
            </div>
            <div className="space-y-1 num">
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-charcoal)]">Systolic:</span>
                <span className="font-semibold text-[var(--color-info)]">{activePoint.bpSys} mmHg</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-charcoal)]">Diastolic:</span>
                <span className="font-semibold text-[var(--color-on-track)]">{activePoint.bpDia} mmHg</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-charcoal)]">Mean Arterial (MAP):</span>
                <span>{activePoint.map} mmHg</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clinical Guidance Interpretation Box */}
      <div className="p-3 border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[12px] leading-relaxed">
        <div className="flex items-start gap-2">
          {isRapidRise || latest.bpSys! >= 140 || latest.bpDia! >= 90 ? (
            <Warning size={16} className="text-[var(--color-overdue)] shrink-0 mt-0.5" />
          ) : (
            <CheckCircle size={16} className="text-[var(--color-on-track)] shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-semibold text-[var(--color-foreground)]">
              {latest.bpSys! >= 140 || latest.bpDia! >= 90
                ? "Gestational Hypertension Detected"
                : isRapidRise
                ? "Pre-eclampsia Trajectory Warning: Accelerated Diastolic Rise"
                : "Blood Pressure within Normal Limits"}
            </p>
            <p className="text-[var(--color-charcoal)]">
              {isRapidRise ? (
                <>
                  Diastolic BP has increased by{" "}
                  <strong className="text-[var(--color-overdue)]">+{deltaDia} mmHg</strong> since booking (
                  {baseline.bpDia} → {latest.bpDia} mmHg). Even before reaching 140/90, a diastolic rise ≥15 mmHg
                  indicates systemic vasoconstriction. Strongly recommend checking <strong>Urine Albumin (Dipstick)</strong>,
                  evaluating for pedal edema / headache / epigastric pain, and scheduling a review in 3–5 days.
                </>
              ) : latest.bpSys! >= 140 || latest.bpDia! >= 90 ? (
                <>
                  BP is above the diagnostic cut-off of 140/90 mmHg. Re-check in 4 hours. If persistent, initiate workup for
                  preeclampsia (platelet count, liver enzymes, serum creatinine, urine protein:creatinine ratio).
                </>
              ) : (
                <>
                  Systolic ({latest.bpSys} mmHg) and Diastolic ({latest.bpDia} mmHg) are tracking stably. Baseline pulse
                  pressure is normal. Continue routine antenatal blood pressure surveillance at each visit.
                </>
              )}
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
  hoveredIndex,
  onHover,
  patientName,
}: {
  visits: ParsedVisit[];
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
  patientName: string;
}) {
  if (visits.length === 0) {
    return (
      <EmptyChartState
        title="No Fundal Height recorded"
        message="Measure and log Symphysio-Fundal Height (SFH in cm) from 20 weeks onwards to compare against the normal fetal growth curve and detect IUGR or macrosomia early."
      />
    );
  }

  // Chart Dimensions
  const W = 680;
  const H = 240;
  const P = { top: 25, right: 35, bottom: 35, left: 45 };
  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;

  // X: Gestational Weeks 16 to 40
  const minW = 16;
  const maxW = 40;
  const getX = (w: number) => P.left + ((Math.max(minW, Math.min(maxW, w)) - minW) / (maxW - minW)) * innerW;

  // Y: SFH cm 14 to 42 cm
  const minSFH = 14;
  const maxSFH = 42;
  const getY = (sfh: number) => P.top + innerH - ((sfh - minSFH) / (maxSFH - minSFH)) * innerH;

  // 10th and 90th percentile corridor (McDonald's rule: SFH roughly equals GA weeks +/- 2.5 cm)
  const corridorTop = [
    `${getX(16)},${getY(16 + 2.5)}`,
    `${getX(24)},${getY(24 + 2.5)}`,
    `${getX(32)},${getY(32 + 2.5)}`,
    `${getX(36)},${getY(36 + 2.5)}`,
    `${getX(40)},${getY(40 + 2.5)}`,
  ];
  const corridorBottom = [
    `${getX(40)},${getY(40 - 2.5)}`,
    `${getX(36)},${getY(36 - 2.5)}`,
    `${getX(32)},${getY(32 - 2.5)}`,
    `${getX(24)},${getY(24 - 2.5)}`,
    `${getX(16)},${getY(16 - 2.5)}`,
  ];
  const corridorPath = `M ${[...corridorTop, ...corridorBottom].join(" L ")} Z`;

  // Median line: y = x
  const medianLine = `M ${getX(16)},${getY(16)} L ${getX(40)},${getY(40)}`;

  // Patient curve
  const patientPoints = visits.map((v) => `${getX(v.gaWeeks!)},${getY(v.sfh!)}`);
  const patientPath = patientPoints.length > 1 ? `M ${patientPoints.join(" L ")}` : "";

  const latest = visits[visits.length - 1];
  const diff = latest.sfh! - latest.gaWeeks!;
  const isIugr = diff < -2.5;
  const isMacrosomia = diff > 2.5;

  const activePoint = hoveredIndex !== null && visits[hoveredIndex] ? visits[hoveredIndex] : null;

  return (
    <div className="space-y-3">
      {/* Legend & Guide */}
      <div className="flex flex-wrap items-center justify-between text-[12px] gap-2 pb-1 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-primary)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" /> {patientName}&apos;s SFH
          </span>
          <span className="inline-flex items-center gap-1.5 text-[var(--color-charcoal)]">
            <span className="h-3 w-4 bg-[var(--color-on-track-surface)] border border-[var(--color-border)]" /> Normal Corridor (10th–90th centile)
          </span>
          <span className="text-[var(--color-charcoal)] hidden sm:inline">
            Dashed line = Expected 50th centile (SFH = GA)
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[540px] select-none"
          style={{ maxHeight: "250px" }}
        >
          {/* Normal Corridor Band (Shaded) */}
          <path d={corridorPath} fill="var(--color-on-track-surface)" opacity={0.6} />

          {/* Grid lines & Y-axis (Fundal Height cm) */}
          {[16, 20, 24, 28, 32, 36, 40].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={P.left}
                  y1={y}
                  x2={P.left + innerW}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeWidth={0.8}
                  strokeDasharray="2 2"
                />
                <text
                  x={P.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="num text-[10px] fill-[var(--color-charcoal)]"
                >
                  {val} cm
                </text>
              </g>
            );
          })}

          {/* Grid lines & X-axis (Gestational Weeks) */}
          {[16, 20, 24, 28, 32, 36, 40].map((wk) => {
            const x = getX(wk);
            return (
              <g key={wk}>
                <line
                  x1={x}
                  y1={P.top}
                  x2={x}
                  y2={P.top + innerH}
                  stroke="var(--color-border)"
                  strokeWidth={0.8}
                  strokeDasharray="2 2"
                />
                <text
                  x={x}
                  y={P.top + innerH + 16}
                  textAnchor="middle"
                  className="num text-[10px] fill-[var(--color-charcoal)]"
                >
                  {wk}w
                </text>
              </g>
            );
          })}

          {/* Median Expected Line (y = x) */}
          <path
            d={medianLine}
            fill="none"
            stroke="var(--color-charcoal)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.7}
          />

          {/* Patient SFH Line */}
          {patientPath && (
            <path
              d={patientPath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Patient Data Points */}
          {visits.map((v, i) => {
            const x = getX(v.gaWeeks!);
            const y = getY(v.sfh!);
            const pointDiff = v.sfh! - v.gaWeeks!;
            const isAbnormal = Math.abs(pointDiff) > 2.5;
            const isHovered = hoveredIndex === i;

            return (
              <g key={v.id} className="cursor-pointer" onMouseEnter={() => onHover(i)}>
                {isHovered && (
                  <line
                    x1={x}
                    y1={P.top}
                    x2={x}
                    y2={P.top + innerH}
                    stroke="var(--color-foreground)"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                )}

                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4.5}
                  fill={isAbnormal ? (pointDiff < 0 ? "var(--color-overdue)" : "var(--color-due)") : "var(--color-primary)"}
                  stroke="var(--color-background)"
                  strokeWidth={2}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {activePoint && hoveredIndex !== null && (
          <div
            className="absolute top-2 right-2 bg-[var(--color-background)] border border-[var(--color-border-strong)] p-2.5 shadow-sm text-[12px] z-10 max-w-xs animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-1 mb-1.5">
              <span className="font-semibold text-[var(--color-foreground)]">{activePoint.dateLabel}</span>
              <span className="num text-[var(--color-charcoal)] font-medium">{activePoint.gaLabel}</span>
            </div>
            <div className="space-y-1 num">
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-charcoal)]">Fundal Height:</span>
                <span className="font-semibold text-[var(--color-primary)]">{activePoint.sfh} cm</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-charcoal)]">Expected (Median):</span>
                <span>{activePoint.gaWeeks ? `${Math.round(activePoint.gaWeeks)} cm` : "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-charcoal)]">Variance:</span>
                <span
                  className={
                    activePoint.sfh! - activePoint.gaWeeks! < -2.5
                      ? "text-[var(--color-overdue)] font-semibold"
                      : activePoint.sfh! - activePoint.gaWeeks! > 2.5
                      ? "text-[var(--color-due)] font-semibold"
                      : "text-[var(--color-on-track)] font-medium"
                  }
                >
                  {(activePoint.sfh! - activePoint.gaWeeks!).toFixed(1)} cm
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clinical Guidance Interpretation Box */}
      <div className="p-3 border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[12px] leading-relaxed">
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
                ? "Fundal Height Lagging (<10th Centile) — High Risk for FGR"
                : isMacrosomia
                ? "Accelerated Fundal Height (>90th Centile)"
                : "Appropriate for Gestational Age (Fetal Growth Normal)"}
            </p>
            <p className="text-[var(--color-charcoal)]">
              {isIugr ? (
                <>
                  The measured SFH ({latest.sfh} cm at {latest.gaLabel}) is lagging by{" "}
                  <strong className="text-[var(--color-overdue)]">{Math.abs(diff).toFixed(1)} cm</strong> below the
                  expected gestation line. A discrepancy &gt;2 cm or a flattening curve raises strong suspicion for{" "}
                  <strong>Intrauterine Growth Restriction (IUGR / FGR)</strong> or oligohydramnios.
                  <strong> Clinical recommendation:</strong> Schedule an immediate Ultrasound Growth Scan + Umbilical
                  Artery Doppler to assess fetal biometry (AC, EFW) and amniotic fluid index (AFI).
                </>
              ) : isMacrosomia ? (
                <>
                  SFH is tracking above the 90th percentile corridor (+{diff.toFixed(1)} cm). Consider differential diagnoses:
                  fetal macrosomia, polyhydramnios, or gestational diabetes. Check recent OGTT blood sugar reports.
                </>
              ) : (
                <>
                  Fundal height closely tracks the gestational age (within ±2.5 cm normal corridor). The fetal growth velocity
                  is satisfactory.
                </>
              )}
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
  hoveredIndex,
  onHover,
  patientName,
}: {
  visits: ParsedVisit[];
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
  patientName: string;
}) {
  if (visits.length === 0) {
    return (
      <EmptyChartState
        title="No Hemoglobin (Hb) recorded"
        message="Log maternal hemoglobin values across visits to monitor for physiological hemodilution and evaluate response to oral or IV iron therapy."
      />
    );
  }

  // Chart Dimensions
  const W = 680;
  const H = 240;
  const P = { top: 25, right: 35, bottom: 35, left: 45 };
  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;

  // Y Scale: Hb 5.0 to 15.0 g/dL
  const minHb = 5.0;
  const maxHb = 15.0;
  const getY = (hb: number) => P.top + innerH - ((hb - minHb) / (maxHb - minHb)) * innerH;

  // X Scale: evenly distributed visits
  const getX = (index: number) => {
    if (visits.length === 1) return P.left + innerW / 2;
    return P.left + (index / (visits.length - 1)) * innerW;
  };

  const points = visits.map((v, i) => `${getX(i)},${getY(v.hb!)}`);
  const hbPath = points.length > 1 ? `M ${points.join(" L ")}` : "";

  const latest = visits[visits.length - 1];
  const baseline = visits[0];
  const delta = Number((latest.hb! - baseline.hb!).toFixed(1));
  const isAnemic = latest.hb! < 11.0;
  const isSevere = latest.hb! < 7.0;

  const activePoint = hoveredIndex !== null && visits[hoveredIndex] ? visits[hoveredIndex] : null;

  return (
    <div className="space-y-3">
      {/* Legend & Guide */}
      <div className="flex flex-wrap items-center justify-between text-[12px] gap-2 pb-1 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-foreground)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-foreground)]" /> Hb Trend Line
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-on-track)]">
            <span className="h-2 w-2 rounded-xs bg-[var(--color-on-track-surface)] border border-[var(--color-on-track)]" /> ≥11.0 Safe Target
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-due)]">
            <span className="h-2 w-2 rounded-xs bg-[var(--color-due-surface)] border border-[var(--color-due)]" /> 10.0–10.9 Mild
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-overdue)]">
            <span className="h-2 w-2 rounded-xs bg-[var(--color-overdue-surface)] border border-[var(--color-overdue)]" /> &lt;10.0 Mod / Severe
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[540px] select-none"
          style={{ maxHeight: "250px" }}
        >
          {/* Severity Bands Background */}
          {/* Safe Zone (>=11.0) */}
          <rect
            x={P.left}
            y={P.top}
            width={innerW}
            height={getY(11.0) - P.top}
            fill="var(--color-on-track-surface)"
            opacity={0.4}
          />
          {/* Mild Anemia (10.0 - 11.0) */}
          <rect
            x={P.left}
            y={getY(11.0)}
            width={innerW}
            height={getY(10.0) - getY(11.0)}
            fill="var(--color-due-surface)"
            opacity={0.4}
          />
          {/* Moderate Anemia (7.0 - 10.0) */}
          <rect
            x={P.left}
            y={getY(10.0)}
            width={innerW}
            height={getY(7.0) - getY(10.0)}
            fill="#fff3e0"
            opacity={0.5}
          />
          {/* Severe Anemia (<7.0) */}
          <rect
            x={P.left}
            y={getY(7.0)}
            width={innerW}
            height={P.top + innerH - getY(7.0)}
            fill="var(--color-overdue-surface)"
            opacity={0.4}
          />

          {/* Grid lines and Y-axis labels */}
          {[6.0, 7.0, 8.0, 10.0, 11.0, 12.0, 14.0].map((val) => {
            const y = getY(val);
            const isBenchmark = val === 11.0 || val === 7.0;
            return (
              <g key={val}>
                <line
                  x1={P.left}
                  y1={y}
                  x2={P.left + innerW}
                  y2={y}
                  stroke={val === 11.0 ? "var(--color-on-track)" : val === 7.0 ? "var(--color-overdue)" : "var(--color-border)"}
                  strokeWidth={isBenchmark ? 1.2 : 0.8}
                  strokeDasharray={isBenchmark ? "4 4" : "2 2"}
                />
                <text
                  x={P.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className={`num text-[10px] ${
                    val === 11.0
                      ? "fill-[var(--color-on-track)] font-semibold"
                      : val === 7.0
                      ? "fill-[var(--color-overdue)] font-semibold"
                      : "fill-[var(--color-charcoal)]"
                  }`}
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Trend Line */}
          {hbPath && (
            <path
              d={hbPath}
              fill="none"
              stroke="var(--color-foreground)"
              strokeWidth={2.4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Data Points */}
          {visits.map((v, i) => {
            const x = getX(i);
            const y = getY(v.hb!);
            const isHovered = hoveredIndex === i;
            const pointTone =
              v.hb! < 7.0
                ? "var(--color-overdue)"
                : v.hb! < 10.0
                ? "var(--color-due)"
                : v.hb! < 11.0
                ? "var(--color-due)"
                : "var(--color-on-track)";

            return (
              <g key={v.id} className="cursor-pointer" onMouseEnter={() => onHover(i)}>
                {isHovered && (
                  <line
                    x1={x}
                    y1={P.top}
                    x2={x}
                    y2={P.top + innerH}
                    stroke="var(--color-foreground)"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                )}

                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4.5}
                  fill={pointTone}
                  stroke="var(--color-background)"
                  strokeWidth={2}
                />

                <text
                  x={x}
                  y={P.top + innerH + 16}
                  textAnchor="middle"
                  className="num text-[10px] fill-[var(--color-foreground)] font-medium"
                >
                  {v.gaLabel}
                </text>
                <text
                  x={x}
                  y={P.top + innerH + 28}
                  textAnchor="middle"
                  className="num text-[9px] fill-[var(--color-charcoal)]"
                >
                  {v.dateLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {activePoint && hoveredIndex !== null && (
          <div
            className="absolute top-2 right-2 bg-[var(--color-background)] border border-[var(--color-border-strong)] p-2.5 shadow-sm text-[12px] z-10 max-w-xs animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-1 mb-1.5">
              <span className="font-semibold text-[var(--color-foreground)]">{activePoint.dateLabel}</span>
              <span className="num text-[var(--color-charcoal)] font-medium">{activePoint.gaLabel}</span>
            </div>
            <div className="space-y-1 num">
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-charcoal)]">Hemoglobin:</span>
                <span
                  className={`font-semibold ${
                    activePoint.hb! < 11.0 ? "text-[var(--color-overdue)]" : "text-[var(--color-on-track)]"
                  }`}
                >
                  {activePoint.hb} g/dL
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--color-charcoal)]">Status:</span>
                <span className="font-medium text-[var(--color-foreground)]">
                  {activePoint.hb! < 7.0
                    ? "Severe Anemia"
                    : activePoint.hb! < 10.0
                    ? "Moderate Anemia"
                    : activePoint.hb! < 11.0
                    ? "Mild Anemia"
                    : "Normal / Adequate"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clinical Guidance Interpretation Box */}
      <div className="p-3 border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[12px] leading-relaxed">
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
                ? "Severe Anemia (<7.0 g/dL) — Urgent Hospital Precaution"
                : isAnemic
                ? `Gestational Anemia (${latest.hb} g/dL)`
                : "Hemoglobin Adequate for Gestational Age"}
            </p>
            <p className="text-[var(--color-charcoal)]">
              {isSevere ? (
                <>
                  Maternal hemoglobin is critically low ({latest.hb} g/dL). High risk of maternal cardiac failure,
                  postpartum hemorrhage (PPH), and fetal compromise.
                  <strong> Clinical recommendation:</strong> Arrange blood grouping/cross-matching, parenteral iron
                  infusion (IV Ferric Carboxymaltose) or packed red blood cell transfusion as indicated.
                </>
              ) : isAnemic ? (
                <>
                  Latest Hb is {latest.hb} g/dL (target ≥11.0 g/dL).
                  {delta < 0 ? (
                    <>
                      {" "}Hemoglobin has dropped by{" "}
                      <strong className="text-[var(--color-overdue)]">{Math.abs(delta)} g/dL</strong> since booking.
                      Evaluate patient compliance with daily elemental iron tablets (IFA), check for dietary inhibitors
                      (tea/coffee), and consider IV iron if oral therapy is not absorbed.
                    </>
                  ) : (
                    <>
                      {" "}Hemoglobin shows an improvement of{" "}
                      <strong className="text-[var(--color-on-track)]">+{delta} g/dL</strong> since baseline. Continue
                      current supplementation and repeat CBC at 28–32 weeks.
                    </>
                  )}
                </>
              ) : (
                <>
                  Hemoglobin ({latest.hb} g/dL) is well maintained above the 11.0 g/dL threshold. Maintain standard prophylactic
                  IFA supplementation (100 mg elemental iron + 500 mcg folic acid daily).
                </>
              )}
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
  hoveredIndex,
  onHover,
  patientName,
}: {
  weightVisits: ParsedVisit[];
  fhrVisits: ParsedVisit[];
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
  patientName: string;
}) {
  if (weightVisits.length === 0 && fhrVisits.length === 0) {
    return (
      <EmptyChartState
        title="No Weight or FHR logged"
        message="Record maternal weight (kg) and Fetal Heart Rate (bpm) at each visit to track gestational weight gain trajectory and fetal cardiac stability."
      />
    );
  }

  // Combined visits having either weight or FHR
  const visits = weightVisits.length >= fhrVisits.length ? weightVisits : fhrVisits;

  // Chart Dimensions
  const W = 680;
  const H = 240;
  const P = { top: 25, right: 35, bottom: 35, left: 45 };
  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;

  // Scale for Weight: minW to maxW
  const weights = weightVisits.map((v) => v.weight!);
  const minWeight = Math.floor(Math.min(...(weights.length ? weights : [50])) - 2);
  const maxWeight = Math.ceil(Math.max(...(weights.length ? weights : [70])) + 5);
  const getYWeight = (w: number) => P.top + innerH - ((w - minWeight) / (maxWeight - minWeight)) * innerH;

  const getX = (index: number) => {
    if (visits.length === 1) return P.left + innerW / 2;
    return P.left + (index / (visits.length - 1)) * innerW;
  };

  const weightPoints = weightVisits.map((v, i) => `${getX(i)},${getYWeight(v.weight!)}`);
  const weightPath = weightPoints.length > 1 ? `M ${weightPoints.join(" L ")}` : "";

  const latestWeight = weightVisits[weightVisits.length - 1] ?? null;
  const baselineWeight = weightVisits[0] ?? null;
  const totalGain =
    latestWeight && baselineWeight ? Number((latestWeight.weight! - baselineWeight.weight!).toFixed(1)) : null;

  const latestFhr = fhrVisits[fhrVisits.length - 1] ?? null;

  const activePoint = hoveredIndex !== null && visits[hoveredIndex] ? visits[hoveredIndex] : null;

  return (
    <div className="space-y-3">
      {/* Legend & Guide */}
      <div className="flex flex-wrap items-center justify-between text-[12px] gap-2 pb-1 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-primary)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" /> Maternal Weight (kg)
          </span>
          <span className="text-[var(--color-charcoal)]">
            Total Gain: <strong className="num text-[var(--color-foreground)]">{totalGain !== null ? `${totalGain > 0 ? "+" : ""}${totalGain} kg` : "—"}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 num text-[11px] text-[var(--color-charcoal)]">
          <span>Latest FHR:</span>
          <strong className={`font-semibold ${latestFhr && (latestFhr.fhr! < 110 || latestFhr.fhr! > 160) ? "text-[var(--color-overdue)]" : "text-[var(--color-foreground)]"}`}>
            {latestFhr ? `${latestFhr.fhr} bpm` : "—"}
          </strong>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[540px] select-none"
          style={{ maxHeight: "250px" }}
        >
          {/* Grid lines and Y-axis labels for Weight */}
          {[minWeight, Math.round((minWeight + maxWeight) / 2), maxWeight].map((val) => {
            const y = getYWeight(val);
            return (
              <g key={val}>
                <line
                  x1={P.left}
                  y1={y}
                  x2={P.left + innerW}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeWidth={0.8}
                  strokeDasharray="2 2"
                />
                <text
                  x={P.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="num text-[10px] fill-[var(--color-charcoal)]"
                >
                  {val} kg
                </text>
              </g>
            );
          })}

          {/* Weight Trend Line */}
          {weightPath && (
            <path
              d={weightPath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2.4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Data Points */}
          {visits.map((v, i) => {
            const x = getX(i);
            const isHovered = hoveredIndex === i;
            const y = v.weight !== null ? getYWeight(v.weight) : null;

            return (
              <g key={v.id} className="cursor-pointer" onMouseEnter={() => onHover(i)}>
                {isHovered && (
                  <line
                    x1={x}
                    y1={P.top}
                    x2={x}
                    y2={P.top + innerH}
                    stroke="var(--color-foreground)"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                )}

                {y !== null && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 4.5}
                    fill="var(--color-primary)"
                    stroke="var(--color-background)"
                    strokeWidth={2}
                  />
                )}

                <text
                  x={x}
                  y={P.top + innerH + 16}
                  textAnchor="middle"
                  className="num text-[10px] fill-[var(--color-foreground)] font-medium"
                >
                  {v.gaLabel}
                </text>
                <text
                  x={x}
                  y={P.top + innerH + 28}
                  textAnchor="middle"
                  className="num text-[9px] fill-[var(--color-charcoal)]"
                >
                  {v.dateLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {activePoint && hoveredIndex !== null && (
          <div
            className="absolute top-2 right-2 bg-[var(--color-background)] border border-[var(--color-border-strong)] p-2.5 shadow-sm text-[12px] z-10 max-w-xs animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-1 mb-1.5">
              <span className="font-semibold text-[var(--color-foreground)]">{activePoint.dateLabel}</span>
              <span className="num text-[var(--color-charcoal)] font-medium">{activePoint.gaLabel}</span>
            </div>
            <div className="space-y-1 num">
              {activePoint.weight !== null && (
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--color-charcoal)]">Weight:</span>
                  <span className="font-semibold text-[var(--color-primary)]">{activePoint.weight} kg</span>
                </div>
              )}
              {activePoint.fhr !== null && (
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--color-charcoal)]">Fetal Heart Rate:</span>
                  <span
                    className={`font-semibold ${
                      activePoint.fhr < 110 || activePoint.fhr > 160
                        ? "text-[var(--color-overdue)]"
                        : "text-[var(--color-foreground)]"
                    }`}
                  >
                    {activePoint.fhr} bpm
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clinical Guidance Interpretation Box */}
      <div className="p-3 border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[12px] leading-relaxed">
        <div className="flex items-start gap-2">
          <CheckCircle size={16} className="text-[var(--color-on-track)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[var(--color-foreground)]">Weight Gain & Fetal Cardiac Summary</p>
            <p className="text-[var(--color-charcoal)]">
              {totalGain !== null ? (
                <>
                  Patient has gained a total of <strong>{totalGain} kg</strong> since the initial visit. Standard IOM
                  recommended gestational weight gain for normal BMI is ~0.4 kg/week during the second and third trimesters
                  (total 11.5–16 kg). Rapid excessive weight gain (&gt;1 kg/week) can be an early indicator of occult fluid
                  retention in pre-eclampsia.
                </>
              ) : (
                "Continuous weight tracking allows monitoring adequate maternal nutrition and early detection of pathological edema."
              )}
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
    <div className="p-8 text-center border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-1)]">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-charcoal)] mb-2">
        <Info size={20} aria-hidden />
      </div>
      <p className="text-[14px] font-medium text-[var(--color-foreground)]">{title}</p>
      <p className="mt-1 text-[12px] text-[var(--color-charcoal)] max-w-md mx-auto">{message}</p>
    </div>
  );
}
