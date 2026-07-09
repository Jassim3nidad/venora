export default function VenuesLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F9FAFB] text-[#111827]">
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        {/* Desktop sidebar skeleton */}
        <aside className="hidden h-full w-[300px] shrink-0 overflow-hidden lg:block">
          <div className="flex h-full flex-col gap-4 border-r border-[#E5E7EB] bg-white p-4">
            {/* Sidebar header */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
            </div>
            {/* Filter skeletons */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid gap-1.5">
                <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                <div className="h-11 w-full rounded-2xl bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="h-full min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-7 xl:px-10">
          <div className="flex flex-col gap-6">
            {/* Header card skeleton */}
            <section className="overflow-hidden rounded-[24px] border border-[#E5E7EB]/90 bg-white shadow-sm shadow-slate-200/60 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 grid gap-3">
                  <div className="h-6 w-36 rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-9 w-72 rounded-xl bg-slate-200 animate-pulse" />
                  <div className="h-5 w-64 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="h-11 w-32 rounded-2xl bg-slate-100 animate-pulse" />
              </div>
              {/* Search area skeleton */}
              <div className="mt-5 grid gap-3 rounded-[20px] border border-slate-200 bg-[#F9FAFB] p-3 sm:p-4">
                <div className="h-12 w-full rounded-2xl bg-slate-100 animate-pulse" />
              </div>
              <div className="mt-3 h-12 w-full rounded-2xl bg-slate-100 animate-pulse" />
            </section>

            {/* Card grid skeleton */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Image placeholder */}
                  <div className="aspect-[16/11] bg-slate-100 animate-pulse" />
                  {/* Content */}
                  <div className="flex flex-col gap-4 p-5">
                    <div className="grid gap-2">
                      <div className="h-5 w-3/4 rounded bg-slate-200 animate-pulse" />
                      <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <div className="grid gap-1">
                        <div className="h-5 w-24 rounded bg-slate-200 animate-pulse" />
                        <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
                      </div>
                      <div className="h-8 w-28 rounded-2xl bg-slate-100 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
