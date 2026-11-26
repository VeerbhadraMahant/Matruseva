import { card, pageBody } from "@/components/ui";

export default function CallsLoading() {
  return (
    <div aria-busy="true">
      <div className="mx-auto w-full max-w-6xl px-4 pb-1 pt-5 md:px-8 md:pt-7">
        <div className="pc-skeleton h-7 w-40" />
        <div className="pc-skeleton mt-2 h-4 w-64 max-w-full" />
      </div>
      <div className={pageBody}>
        <div className={`overflow-hidden ${card}`}>
          <div className="flex gap-2 border-b border-[var(--color-border)] p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="pc-skeleton h-9 w-24 !rounded-full" />
            ))}
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-0">
              <div className="pc-skeleton h-4 w-4" />
              <div className="flex-1 space-y-2">
                <div className="pc-skeleton h-4 w-44 max-w-full" />
                <div className="pc-skeleton h-3 w-64 max-w-full" />
                <div className="pc-skeleton h-3 w-48 max-w-full" />
              </div>
              <div className="pc-skeleton hidden h-10 w-24 md:block" />
              <div className="pc-skeleton hidden h-10 w-28 md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
