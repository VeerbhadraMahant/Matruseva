import { card } from "@/components/ui";

/** Loading state shaped like the patient record: header card, timeline, vitals, schedule. */
export default function PatientLoading() {
  return (
    <div aria-busy="true" aria-label="Loading patient" className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-12 pt-6 md:px-8 md:pt-8">
      <div className="pc-skeleton h-4 w-32" />

      <div className={`overflow-hidden ${card}`}>
        <div className="flex items-center gap-4 p-5">
          <div className="pc-skeleton h-14 w-14 shrink-0 !rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="pc-skeleton h-7 w-56 max-w-full" />
            <div className="pc-skeleton h-3.5 w-72 max-w-full" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="pc-skeleton h-10 w-28 !rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-[var(--color-border)] p-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className="pc-skeleton h-3 w-20" />
              <div className="pc-skeleton h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className={`space-y-4 p-4 ${card}`}>
        <div className="pc-skeleton h-4 w-40" />
        <div className="pc-skeleton h-16 w-full !rounded-xl" />
      </div>

      <div className={`space-y-4 p-4 ${card}`}>
        <div className="pc-skeleton h-4 w-32" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="pc-skeleton h-20 !rounded-xl" />
          ))}
        </div>
        <div className="pc-skeleton h-56 w-full !rounded-xl" />
      </div>
    </div>
  );
}
