export default function BookingsLoading() {
  return (
    <div className="bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Page header skeleton */}
        <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-3">
              <div className="h-6 w-32 rounded-full bg-slate-100 animate-pulse" />
              <div className="h-9 w-72 rounded-xl bg-slate-200 animate-pulse" />
              <div className="h-5 w-96 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="h-12 w-36 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        </div>

        {/* Stats row skeleton — 5 cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/60"
            >
              <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
              <div className="mt-3 h-8 w-10 rounded-lg bg-slate-200 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Booking card skeletons */}
        <div className="grid gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
                {/* Image side */}
                <div className="h-56 bg-slate-100 animate-pulse lg:h-full lg:min-h-[200px]" />

                {/* Content side */}
                <div className="grid gap-5 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="grid gap-3">
                      {/* Status badge */}
                      <div className="h-6 w-24 rounded-full bg-slate-100 animate-pulse" />
                      {/* Venue name */}
                      <div className="h-7 w-56 rounded-lg bg-slate-200 animate-pulse" />
                      {/* Meta items */}
                      <div className="flex flex-wrap gap-3">
                        <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />
                        <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                        <div className="h-4 w-20 rounded bg-slate-100 animate-pulse" />
                      </div>
                    </div>
                    {/* Quote box */}
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 w-36">
                      <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
                      <div className="mt-2 h-6 w-24 rounded-lg bg-slate-200 animate-pulse" />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <div className="h-12 w-36 rounded-2xl bg-slate-200 animate-pulse" />
                    <div className="h-12 w-28 rounded-2xl bg-slate-100 animate-pulse" />
                  </div>

                  {/* Status text */}
                  <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
