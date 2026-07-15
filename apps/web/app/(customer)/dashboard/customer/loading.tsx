export default function CustomerDashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Page header skeleton */}
      <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3">
            <div className="h-6 w-28 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-9 w-64 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-5 w-80 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
      </div>

      {/* KPI cards — 4 columns */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-2 flex-1">
                <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                <div className="h-8 w-16 rounded-lg bg-slate-200 animate-pulse" />
              </div>
              <div className="h-9 w-9 rounded-xl bg-slate-100 animate-pulse shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row — revenue trend + status donut */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Revenue trend chart panel */}
        <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/60">
          <div className="border-b border-[#E5E7EB] p-5">
            <div className="h-5 w-40 rounded bg-slate-200 animate-pulse" />
            <div className="mt-1.5 h-4 w-56 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="p-5">
            {/* Fake bar chart */}
            <div className="flex items-end gap-2 h-40">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-lg bg-slate-100 animate-pulse"
                  style={{
                    height: `${30 + Math.sin(i * 0.7) * 25 + 30}%`,
                    animationDelay: `${i * 40}ms`,
                  }}
                />
              ))}
            </div>
            {/* X-axis labels */}
            <div className="mt-2 flex gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-3 rounded bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Status donut chart panel */}
        <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/60">
          <div className="border-b border-[#E5E7EB] p-5">
            <div className="h-5 w-32 rounded bg-slate-200 animate-pulse" />
            <div className="mt-1.5 h-4 w-48 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-4 p-5">
            {/* Donut placeholder */}
            <div className="h-40 w-40 rounded-full border-[16px] border-slate-100 animate-pulse" />
            {/* Legend items */}
            <div className="w-full grid gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-slate-200 animate-pulse shrink-0" />
                  <div className="h-3 flex-1 rounded bg-slate-100 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top venues bar chart panel */}
      <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/60">
        <div className="border-b border-[#E5E7EB] p-5">
          <div className="h-5 w-32 rounded bg-slate-200 animate-pulse" />
          <div className="mt-1.5 h-4 w-64 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="p-5 grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-28 shrink-0 rounded bg-slate-100 animate-pulse" />
              <div
                className="h-6 rounded-lg bg-slate-100 animate-pulse"
                style={{
                  width: `${80 - i * 15}%`,
                  animationDelay: `${i * 60}ms`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
