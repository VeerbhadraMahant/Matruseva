"use client";

import { useEffect, useState } from "react";
import {
  Buildings,
  CalendarBlank,
  ChatCircleText,
  Gauge,
  SealCheck,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";

const ICONS: Record<string, Icon> = {
  clinic: Buildings,
  thresholds: Gauge,
  staff: UsersThree,
  schedule: CalendarBlank,
  templates: ChatCircleText,
  signoff: SealCheck,
};

/**
 * Section navigation with scroll-spy. A sticky list on wide screens, a
 * horizontally scrollable chip strip on narrow ones. The current section is
 * marked with aria-current.
 */
export function SettingsNav({ sections, label }: { sections: { id: string; title: string }[]; label: string }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    // Current section = the last one whose top has passed 35% of the viewport height.
    const observer = new IntersectionObserver(
      () => {
        let current = sections[0]?.id;
        for (const s of sections) {
          const el = document.getElementById(s.id);
          if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) current = s.id;
        }
        setActive(current);
      },
      { rootMargin: "0px 0px -65% 0px", threshold: [0, 1] },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label={label}>
      <ul className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:px-8 lg:block lg:space-y-1 lg:overflow-visible lg:px-0">
        {sections.map((s) => {
          const Icon = ICONS[s.id];
          const current = active === s.id;
          return (
            <li key={s.id} className="shrink-0 lg:shrink">
              <a
                href={`#${s.id}`}
                aria-current={current ? "true" : undefined}
                onClick={() => setActive(s.id)}
                className={`flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-[var(--radius-buttons)] px-3 text-[13px] font-medium leading-snug transition-colors duration-150 active:scale-[0.98] motion-reduce:active:scale-100 lg:whitespace-normal ${
                  current
                    ? "bg-[var(--color-primary-surface)] text-[var(--color-primary)]"
                    : "bg-[var(--color-background)] text-[var(--color-charcoal)] ring-1 ring-inset ring-[var(--color-border)] hover:text-[var(--color-primary)] lg:bg-transparent lg:ring-0 lg:hover:bg-[var(--color-surface-2)]"
                }`}
              >
                {Icon && <Icon size={18} weight={current ? "fill" : "regular"} aria-hidden className="shrink-0" />}
                {s.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
