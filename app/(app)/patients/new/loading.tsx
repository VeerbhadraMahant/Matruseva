import { card, pageBody } from "@/components/ui";

export default function NewPatientLoading() {
  return (
    <div aria-busy="true" aria-label="Loading form" className={`${pageBody} pt-6 md:pt-9`}>
      <div className="pc-skeleton h-8 w-48" />
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className={`space-y-4 p-5 ${card}`}>
          <div className="pc-skeleton h-4 w-36" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, j) => (
              <div key={j} className="pc-skeleton h-11 w-full !rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
