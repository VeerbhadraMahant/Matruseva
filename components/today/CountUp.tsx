"use client";

import { useEffect, useRef } from "react";

const DURATION_MS = 700;

/** Animates 0 → value once on mount. Screen readers get the final value only. */
export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = String(value);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = String(Math.round(eased * value));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    el.textContent = "0";
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden>
        0
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
