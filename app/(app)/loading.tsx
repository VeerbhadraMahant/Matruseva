export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-background)] px-6 py-4">
        <div className="skeleton h-7 w-48" />
        <div className="skeleton mt-2 h-4 w-72" />
      </div>
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 border-l border-t border-[var(--color-border)] sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="border-r border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton mt-2 h-7 w-12" />
            </div>
          ))}
        </div>
        <div className="border border-[var(--color-border)] bg-[var(--color-background)]">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex gap-4 border-b border-[var(--color-border)] px-3 py-3 last:border-0">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
