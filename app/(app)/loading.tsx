import { card } from "@/components/ui";

/** Shared loading state for list pages (patients, call queue, documents, OPD). */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 md:px-8 md:pt-9">
      <div className="pc-skeleton h-8 w-56" />
      <div className="pc-skeleton mt-3 h-4 w-72 max-w-full" />

      <div className={`mt-6 overflow-hidden ${card}`}>
        <div className="space-y-3 p-4">
          <div className="pc-skeleton h-11 w-full max-w-md !rounded-xl" />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="pc-skeleton h-10 w-24 shrink-0 !rounded-full" />
            ))}
          </div>
        </div>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-[var(--color-border)]/70 px-4 py-4">
            <div className="pc-skeleton h-9 w-9 shrink-0 !rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="pc-skeleton h-3.5 w-40 max-w-full" />
              <div className="pc-skeleton h-3 w-56 max-w-full" />
            </div>
            <div className="pc-skeleton hidden h-6 w-20 !rounded-full sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
