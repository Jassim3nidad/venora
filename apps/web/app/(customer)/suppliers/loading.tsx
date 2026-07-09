export default function SuppliersLoading() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#F8FAFC]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {/* Header card skeleton */}
        <section className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/70 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 grid gap-3">
              <div className="h-6 w-40 rounded-full bg-slate-100 animate-pulse" />
              <div className="h-9 w-80 rounded-xl bg-slate-200 animate-pulse" />
              <div className="h-5 w-64 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="h-16 w-32 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Sidebar skeleton */}
          <aside className="self-start rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/70 lg:sticky lg:top-24">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-16 rounded bg-slate-200 animate-pulse" />
            </div>
            <div className="grid gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid gap-1.5">
                  <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                  <div className="h-12 w-full rounded-2xl bg-slate-100 animate-pulse" />
                </div>
              ))}
            </div>
          </aside>

          {/* Card grid skeleton */}
          <section className="min-w-0">
            <div className="mb-5 rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid gap-2">
                  <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
                  <div className="h-4 w-56 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="h-12 w-[240px] rounded-2xl bg-slate-100 animate-pulse" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  {/* Image placeholder */}
                  <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
                  {/* Content */}
                  <div className="flex flex-col gap-4 p-5">
                    <div className="grid gap-2">
                      <div className="flex gap-2">
                        <div className="h-5 w-20 rounded-full bg-slate-100 animate-pulse" />
                        <div className="h-5 w-16 rounded-full bg-slate-100 animate-pulse" />
                      </div>
                      <div className="h-6 w-3/4 rounded bg-slate-200 animate-pulse" />
                      <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
                      <div className="h-4 w-2/3 rounded bg-slate-100 animate-pulse" />
                    </div>
                    <div className="grid gap-2">
                      <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
                      <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                    </div>
                    <div className="flex items-end justify-between border-t border-[#E5E7EB] pt-4">
                      <div className="grid gap-1">
                        <div className="h-3 w-12 rounded bg-slate-100 animate-pulse" />
                        <div className="h-6 w-20 rounded bg-slate-200 animate-pulse" />
                      </div>
                      <div className="h-11 w-28 rounded-2xl bg-slate-100 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
