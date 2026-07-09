export default function FavoritesLoading() {
  return (
    <>
      {/* Hero / stats header skeleton */}
      <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            {/* Left: heading */}
            <div className="grid gap-3">
              <div className="h-6 w-32 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-12 w-3/4 rounded-xl bg-slate-200 animate-pulse" />
              <div className="h-5 w-full max-w-lg rounded bg-slate-100 animate-pulse" />
              <div className="h-5 w-2/3 rounded bg-slate-100 animate-pulse" />
            </div>

            {/* Right: stats card */}
            <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-xl shadow-slate-200/60">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i}>
                    <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                    <div className="mt-2 h-9 w-10 rounded-lg bg-slate-200 animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="mt-4 h-4 w-48 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Tab bar + grid skeleton */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tab switcher */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-2">
            <div className="h-10 w-28 rounded-2xl bg-slate-200 animate-pulse" />
            <div className="h-10 w-32 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
          <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
        </div>

        {/* Venue card grid skeleton */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Image */}
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
      </section>
    </>
  );
}
