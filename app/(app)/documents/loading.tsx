import { card, pageBody } from "@/components/ui";

export default function DocumentsLoading() {
  return (
    <div aria-busy="true">
      <div className="mx-auto w-full max-w-6xl px-4 pb-1 pt-5 md:px-8 md:pt-7">
        <div className="pc-skeleton h-7 w-40" />
        <div className="pc-skeleton mt-2 h-4 w-72 max-w-full" />
      </div>
      <div className={pageBody}>
        <div className={`${card} p-4`}>
          <div className="pc-skeleton h-36 w-full" />
        </div>
        <div className={`${card} p-4`}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-[var(--radius-cards)] border border-[var(--color-border)]">
                <div className="pc-skeleton h-44 !rounded-none" />
                <div className="space-y-2 p-3">
                  <div className="pc-skeleton h-4 w-40" />
                  <div className="pc-skeleton h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
