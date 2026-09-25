import { daysBetween, parseLocalDate } from "@/lib/format";
import type { CareEventStatus } from "@/lib/supabase/enums";

const TOTAL_DAYS = 42 * 7;

const BAR: Record<CareEventStatus, string> = {
  done: "bg-[var(--color-on-track)]",
  skipped: "bg-[var(--color-surface-4)]",
  upcoming: "bg-[var(--color-border-strong)]",
  due: "bg-[var(--color-due)]",
  overdue: "bg-[var(--color-overdue)]",
};

interface TimelineEvent {
  id: string;
  name: string;
  dueFrom: string;
  dueTo: string;
  status: CareEventStatus;
}

const pct = (days: number) => `${(Math.min(Math.max(days, 0), TOTAL_DAYS) / TOTAL_DAYS) * 100}%`;

/** Greedy lane packing so overlapping windows stack instead of colliding. */
function assignLanes(items: { start: number; end: number }[]): number[] {
  const laneEnds: number[] = [];
  return items.map(({ start, end }) => {
    let lane = laneEnds.findIndex((e) => e < start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else laneEnds[lane] = end;
    return lane;
  });
}

export function PregnancyTimeline({ lmp, gaDays, events }: { lmp: string; gaDays: number; events: TimelineEvent[] }) {
  const lmpDate = parseLocalDate(lmp);
  const spans = events.map((e) => ({
    ...e,
    start: daysBetween(lmpDate, parseLocalDate(e.dueFrom)),
    // single-day windows (e.g. 28w Anti-D) still need a visible width
    end: Math.max(daysBetween(lmpDate, parseLocalDate(e.dueTo)), daysBetween(lmpDate, parseLocalDate(e.dueFrom)) + 3),
  }));
  const lanes = assignLanes(spans);
  const laneCount = Math.max(1, ...lanes.map((l) => l + 1));
  const LANE_H = 16;

  return (
    <div className="overflow-x-auto px-3 pt-2 pb-3">
      <div className="relative min-w-[640px]">
        <div className="relative flex h-6 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-charcoal)]">
          <div className="border-l border-[var(--color-border-strong)] pl-1" style={{ width: pct(13 * 7) }}>
            T1
          </div>
          <div className="border-l border-[var(--color-border-strong)] pl-1" style={{ width: `calc(${pct(27 * 7)} - ${pct(13 * 7)})` }}>
            T2
          </div>
          <div className="border-l border-[var(--color-border-strong)] pl-1" style={{ width: `calc(${pct(40 * 7)} - ${pct(27 * 7)})` }}>
            T3
          </div>
          <div className="flex-1 border-l border-[var(--color-border-strong)] pl-1">Term+</div>
        </div>

        <div className="relative border-y border-[var(--color-border)] bg-[var(--color-surface-1)]" style={{ height: laneCount * LANE_H + 8 }}>
          {[13, 27, 40].map((w) => (
            <div key={w} className="absolute inset-y-0 w-px bg-[var(--color-border-strong)]" style={{ left: pct(w * 7) }} aria-hidden />
          ))}
          {spans.map((s, i) => (
            <div
              key={s.id}
              title={`${s.name} · wk ${Math.floor(s.start / 7)}–${Math.floor(s.end / 7)} · ${s.status}`}
              className={`absolute h-[10px] ${BAR[s.status]}`}
              style={{
                left: pct(s.start),
                width: `calc(${pct(s.end)} - ${pct(s.start)})`,
                top: 4 + lanes[i] * LANE_H + 3,
              }}
            />
          ))}
          <div className="absolute -top-1 -bottom-1 w-[2px] bg-[var(--color-foreground)]" style={{ left: pct(gaDays) }} aria-hidden />
        </div>

        <div className="num relative h-5 text-[11px] text-[var(--color-charcoal)]">
          {[0, 8, 13, 20, 27, 32, 36, 40].map((w) => (
            <span key={w} className="absolute -translate-x-1/2" style={{ left: pct(w * 7) }}>
              {w}w
            </span>
          ))}
          <span
            className="absolute -translate-x-1/2 bg-[var(--color-foreground)] px-1 font-medium text-white"
            style={{ left: pct(gaDays), top: 2 }}
          >
            Today {Math.floor(gaDays / 7)}w{gaDays % 7}d
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-charcoal)]">
          {(["done", "due", "overdue", "upcoming"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 capitalize">
              <span className={`h-2.5 w-2.5 ${BAR[s]}`} aria-hidden /> {s === "due" ? "Due now" : s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
