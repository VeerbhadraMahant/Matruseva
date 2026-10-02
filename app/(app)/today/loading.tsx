export default function TodayLoading() {
  return (
    <div aria-busy="true" aria-label="Loading today" className="pc-scope min-h-dvh px-4 pb-12 pt-6 md:px-8 md:pt-9">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <div className="pc-skeleton h-3 w-48" />
          <div className="pc-skeleton mt-3 h-8 w-72 max-w-full" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="pc-glass h-[248px] rounded-[28px] p-7">
              <div className="pc-skeleton h-3 w-36" />
              <div className="pc-skeleton mt-4 h-16 w-28" />
              <div className="mt-8 flex gap-6">
                <div className="pc-skeleton h-10 w-20" />
                <div className="pc-skeleton h-10 w-20" />
              </div>
            </div>
            <div className="pc-glass grid grid-cols-7 gap-2 rounded-[24px] p-2">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="pc-skeleton h-[84px] !rounded-full" />
              ))}
            </div>
            <div className="pc-glass space-y-1 rounded-[24px] p-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="pc-skeleton h-10 w-10 !rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="pc-skeleton h-3.5 w-40" />
                    <div className="pc-skeleton h-3 w-56 max-w-full" />
                  </div>
                  <div className="pc-skeleton h-6 w-20 !rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="pc-glass aspect-square max-h-32 rounded-[24px]" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="pc-glass h-[148px] rounded-[22px] p-4">
                  <div className="pc-skeleton h-3 w-24" />
                  <div className="pc-skeleton mt-6 h-8 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
