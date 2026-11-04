import { getClinicSnapshot } from "@/lib/snapshot";

/**
 * Overdue-patient count for the Call queue nav item. Async server component:
 * render it inside <Suspense fallback={null}> so the nav never waits on the
 * snapshot queries. Styling reacts to the sidebar's `group/sb` data-collapsed
 * attribute (number pill when expanded, small dot on the icon when collapsed).
 */
export async function CallQueueBadge() {
  let count = 0;
  try {
    const { rows } = await getClinicSnapshot();
    count = rows.filter((r) => r.overdue.length > 0).length;
  } catch {
    return null;
  }
  if (count <= 0) return null;
  return (
    <span
      className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[11px] font-semibold leading-5 text-white group-data-[collapsed=true]/sb:absolute group-data-[collapsed=true]/sb:right-2 group-data-[collapsed=true]/sb:top-2 group-data-[collapsed=true]/sb:ml-0 group-data-[collapsed=true]/sb:h-2.5 group-data-[collapsed=true]/sb:w-2.5 group-data-[collapsed=true]/sb:min-w-0 group-data-[collapsed=true]/sb:p-0 group-data-[collapsed=true]/sb:ring-2 group-data-[collapsed=true]/sb:ring-[var(--color-background)] group-aria-[current=page]/link:bg-white group-aria-[current=page]/link:text-[var(--color-primary)]"
    >
      <span aria-hidden className="group-data-[collapsed=true]/sb:hidden">
        {count > 99 ? "99+" : count}
      </span>
      <span className="sr-only">
        {count} {count === 1 ? "patient" : "patients"} overdue
      </span>
    </span>
  );
}
