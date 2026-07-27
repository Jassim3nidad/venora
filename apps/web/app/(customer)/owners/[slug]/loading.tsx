function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-[#E5E7EB] ${className}`} />
  );
}

export default function OwnerProfileLoading() {
  return (
    <main className="mx-auto min-w-0 max-w-7xl space-y-10 px-4 pb-20 pt-6 font-sans text-[#151C27] sm:px-6 sm:pt-8 lg:px-8">
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-4 w-12" />
        <SkeletonBlock className="h-4 w-4" />
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-4 w-4" />
        <SkeletonBlock className="h-4 w-36" />
      </div>

      <section className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
        <SkeletonBlock className="h-40 rounded-none sm:h-56 lg:h-64" />
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <SkeletonBlock className="h-20 w-20 sm:h-24 sm:w-24" />
              <div className="space-y-3 pb-1">
                <SkeletonBlock className="h-4 w-48" />
                <SkeletonBlock className="h-9 w-72 max-w-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <SkeletonBlock className="h-11 w-32" />
              <SkeletonBlock className="h-11 w-28" />
            </div>
          </div>
          <SkeletonBlock className="mt-5 h-4 max-w-3xl" />
          <SkeletonBlock className="mt-3 h-4 max-w-2xl" />
          <SkeletonBlock className="mt-4 h-4 w-64 max-w-full" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#E5E7EB] sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="bg-white p-4">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="mt-2 h-4 w-24" />
          </div>
        ))}
      </section>

      <section className="grid gap-8 border-y border-[#E5E7EB] py-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:py-10">
        <div>
          <SkeletonBlock className="h-8 w-64 max-w-full" />
          <SkeletonBlock className="mt-5 h-4 max-w-3xl" />
          <SkeletonBlock className="mt-3 h-4 max-w-2xl" />
          <SkeletonBlock className="mt-3 h-4 max-w-xl" />
        </div>
        <aside className="space-y-4 border-t border-[#E5E7EB] pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <SkeletonBlock className="h-5 w-44" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
          <SkeletonBlock className="h-4 w-4/6" />
        </aside>
      </section>

      <section className="space-y-5">
        <div>
          <SkeletonBlock className="h-8 w-72 max-w-full" />
          <SkeletonBlock className="mt-3 h-4 w-96 max-w-full" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white"
            >
              <SkeletonBlock className="aspect-[4/3] rounded-none" />
              <div className="space-y-3 p-4">
                <SkeletonBlock className="h-6 w-4/5" />
                <SkeletonBlock className="h-4 w-3/5" />
                <div className="flex gap-2">
                  <SkeletonBlock className="h-7 w-24" />
                  <SkeletonBlock className="h-7 w-28" />
                </div>
                <SkeletonBlock className="h-px w-full" />
                <SkeletonBlock className="h-6 w-40" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
