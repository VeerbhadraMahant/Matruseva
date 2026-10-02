"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

/*
  Shared line chart for antenatal trends.
  - x is a continuous number (gestational weeks, or visit order when no LMP)
  - one y-scale per chart (never dual axis — use two charts instead)
  - 2px lines, ringed dots, solid hairline grid, direct label on the latest value
  - crosshair + tooltip on hover, arrow keys when focused, screen-reader table
*/

export interface TrendPoint {
  x: number;
  y: number;
}

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  points: TrendPoint[];
}

export interface TrendBand {
  from: number;
  to: number;
  label: string;
  tone: "ok" | "warn" | "bad";
}

export interface TrendRefLine {
  y: number;
  label: string;
}

export interface TrendCorridor {
  lower: (x: number) => number;
  upper: (x: number) => number;
  mid?: (x: number) => number;
  label: string;
}

export interface TrendXMeta {
  title: string;
  sub?: string;
}

const BAND_FILL: Record<TrendBand["tone"], string> = {
  ok: "var(--color-pc-active-soft)",
  warn: "var(--color-pc-risk-soft)",
  bad: "var(--color-pc-overdue-soft)",
};

const HEIGHT = 256;
const M = { top: 30, right: 64, bottom: 30, left: 44 };

function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => span / s <= count) ?? raw;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

export function TrendChart({
  series,
  unit,
  xDomain,
  yDomain,
  xTicks,
  xTickLabel,
  xMeta,
  bands = [],
  refLines = [],
  corridor,
  decimals = 0,
  ariaLabel,
}: {
  series: TrendSeries[];
  unit: string;
  xDomain: [number, number];
  yDomain: [number, number];
  xTicks: number[];
  xTickLabel: (x: number) => string;
  xMeta: (x: number) => TrendXMeta;
  bands?: TrendBand[];
  refLines?: TrendRefLine[];
  corridor?: TrendCorridor;
  decimals?: number;
  ariaLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = width - M.left - M.right;
  const innerH = HEIGHT - M.top - M.bottom;
  const [x0, x1] = xDomain;
  const [y0, y1] = yDomain;
  const sx = (x: number) => M.left + ((x - x0) / (x1 - x0 || 1)) * innerW;
  const sy = (y: number) => M.top + innerH - ((y - y0) / (y1 - y0 || 1)) * innerH;
  const clampY = (y: number) => Math.max(y0, Math.min(y1, y));

  const yTicks = useMemo(() => niceTicks(y0, y1, 5), [y0, y1]);
  const xs = useMemo(
    () => [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b),
    [series],
  );
  const fmt = (v: number) => v.toFixed(decimals);

  // Direct end labels, nudged apart when two series finish close together.
  const endLabels = series
    .filter((s) => s.points.length > 0)
    .map((s) => {
      const last = s.points[s.points.length - 1];
      return { key: s.key, x: sx(last.x), y: sy(last.y), text: fmt(last.y) };
    })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < endLabels.length; i++) {
    if (endLabels[i].y - endLabels[i - 1].y < 16) endLabels[i].y = endLabels[i - 1].y + 16;
  }

  const activeX = active !== null ? xs[active] : null;

  const pickNearest = (clientX: number) => {
    const el = wrapRef.current;
    if (!el || xs.length === 0) return;
    const px = clientX - el.getBoundingClientRect().left;
    let best = 0;
    xs.forEach((x, i) => {
      if (Math.abs(sx(x) - px) < Math.abs(sx(xs[best]) - px)) best = i;
    });
    setActive(best);
  };

  const corridorPath = corridor
    ? (() => {
        const steps = 24;
        const pts: string[] = [];
        for (let i = 0; i <= steps; i++) {
          const x = x0 + ((x1 - x0) * i) / steps;
          pts.push(`${sx(x)},${sy(clampY(corridor.upper(x)))}`);
        }
        for (let i = steps; i >= 0; i--) {
          const x = x0 + ((x1 - x0) * i) / steps;
          pts.push(`${sx(x)},${sy(clampY(corridor.lower(x)))}`);
        }
        return `M ${pts.join(" L ")} Z`;
      })()
    : null;

  // Tooltip sits beside the crosshair, flipping to the left in the right half so it never hides the end labels.
  const TOOLTIP_W = 176;
  const tooltipLeft =
    activeX === null
      ? 0
      : sx(activeX) > width / 2
        ? Math.max(8, sx(activeX) - 14 - TOOLTIP_W)
        : Math.min(sx(activeX) + 14, width - TOOLTIP_W - 8);

  return (
    <div className="space-y-3">
      {(series.length > 1 || bands.length > 0 || corridor || refLines.length > 0) && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--color-charcoal)]" aria-label="Legend">
          {series.length > 1 &&
            series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span aria-hidden className="h-[2px] w-4 rounded-full" style={{ background: s.color }} />
                <span className="text-[var(--color-foreground)]">{s.label}</span>
              </li>
            ))}
          {corridor && (
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-4 rounded-sm" style={{ background: BAND_FILL.ok }} />
              {corridor.label}
            </li>
          )}
          {bands.map((b) => (
            <li key={b.label} className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-4 rounded-sm" style={{ background: BAND_FILL[b.tone] }} />
              {b.label}
            </li>
          ))}
          {[...new Set(refLines.map((r) => r.label))].map((label) => (
            <li key={label} className="flex items-center gap-1.5">
              <span aria-hidden className="h-[2px] w-4 rounded-full bg-[var(--color-pc-overdue)]" />
              {label}
            </li>
          ))}
        </ul>
      )}

      <div
        ref={wrapRef}
        tabIndex={0}
        role="group"
        aria-label={`${ariaLabel}. Use left and right arrow keys to step through visits.`}
        aria-describedby={tableId}
        className="relative rounded-xl outline-offset-4"
        onPointerMove={(e) => pickNearest(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? xs.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((a) => Math.min(xs.length - 1, (a ?? -1) + 1));
          else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? xs.length) - 1));
          else return;
          e.preventDefault();
        }}
      >
        <svg width={width} height={HEIGHT} className="block select-none" aria-hidden>
          {bands.map((b) => (
            <rect
              key={b.label}
              x={M.left}
              width={innerW}
              y={sy(clampY(b.to))}
              height={Math.max(0, sy(clampY(b.from)) - sy(clampY(b.to)))}
              fill={BAND_FILL[b.tone]}
              opacity={0.7}
            />
          ))}
          {corridorPath && <path d={corridorPath} fill={BAND_FILL.ok} opacity={0.8} />}

          {yTicks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={M.left + innerW} y1={sy(t)} y2={sy(t)} stroke="var(--color-border)" strokeWidth={1} />
              <text x={M.left - 10} y={sy(t) + 4} textAnchor="end" className="fill-[var(--color-charcoal)] text-[12px] tabular-nums">
                {t}
              </text>
            </g>
          ))}
          <text x={M.left - 10} y={12} textAnchor="end" className="fill-[var(--color-charcoal)] text-[11px] font-medium">
            {unit}
          </text>

          {xTicks.map((t) => (
            <text key={t} x={sx(t)} y={HEIGHT - 8} textAnchor="middle" className="fill-[var(--color-charcoal)] text-[12px] tabular-nums">
              {xTickLabel(t)}
            </text>
          ))}

          {corridor?.mid && (
            <line
              x1={sx(x0)}
              y1={sy(clampY(corridor.mid(x0)))}
              x2={sx(x1)}
              y2={sy(clampY(corridor.mid(x1)))}
              stroke="var(--color-pc-active)"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          )}

          {refLines.map((r) => (
            <line
              key={`${r.label}-${r.y}`}
              x1={M.left}
              x2={M.left + innerW}
              y1={sy(r.y)}
              y2={sy(r.y)}
              stroke="var(--color-pc-overdue)"
              strokeOpacity={0.6}
              strokeWidth={1}
            />
          ))}

          {activeX !== null && (
            <line x1={sx(activeX)} x2={sx(activeX)} y1={M.top} y2={M.top + innerH} stroke="var(--color-border-strong)" strokeWidth={1} />
          )}

          {series.map((s) =>
            s.points.length > 1 ? (
              <path
                key={s.key}
                d={`M ${s.points.map((p) => `${sx(p.x)},${sy(clampY(p.y))}`).join(" L ")}`}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null,
          )}

          {series.map((s) =>
            s.points.map((p) => {
              const on = activeX === p.x;
              return (
                <circle
                  key={`${s.key}-${p.x}`}
                  cx={sx(p.x)}
                  cy={sy(clampY(p.y))}
                  r={on ? 6 : 4.5}
                  fill={s.color}
                  stroke="var(--color-background)"
                  strokeWidth={2}
                />
              );
            }),
          )}

          {endLabels.map((l) => (
            <text key={l.key} x={l.x + 10} y={l.y + 4} className="fill-[var(--color-foreground)] text-[12px] font-semibold tabular-nums">
              {l.text}
            </text>
          ))}
        </svg>

        {activeX !== null && (
          <div
            className="pointer-events-none absolute top-8 z-10 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-[12px] shadow-[0_12px_28px_-12px_rgb(62_42_92/0.35)]"
            style={{ left: tooltipLeft }}
          >
            <p className="font-semibold text-[var(--color-foreground)]">{xMeta(activeX).title}</p>
            {xMeta(activeX).sub && <p className="text-[var(--color-charcoal)]">{xMeta(activeX).sub}</p>}
            <ul className="mt-2 space-y-1">
              {series.map((s) => {
                const p = s.points.find((pt) => pt.x === activeX);
                if (!p) return null;
                return (
                  <li key={s.key} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[var(--color-charcoal)]">
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                      {fmt(p.y)} <span className="font-normal text-[var(--color-charcoal)]">{unit}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <table id={tableId} className="sr-only">
          <caption>{ariaLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Visit</th>
              {series.map((s) => (
                <th key={s.key} scope="col">
                  {s.label} ({unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {xs.map((x) => (
              <tr key={x}>
                <th scope="row">
                  {xMeta(x).title}
                  {xMeta(x).sub ? `, ${xMeta(x).sub}` : ""}
                </th>
                {series.map((s) => {
                  const p = s.points.find((pt) => pt.x === x);
                  return <td key={s.key}>{p ? fmt(p.y) : "—"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
