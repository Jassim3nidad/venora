import {
  LoadingRegion,
  SkeletonBadge,
  SkeletonBlock,
  SkeletonButton,
  SkeletonTextLines,
} from "@/src/components/skeleton/SkeletonPrimitives";

function FilterRailSkeleton() {
  return (
    <div className="flex h-full max-h-full w-[300px] max-w-[300px] flex-shrink-0 flex-col overflow-hidden border-r border-[#E5E7EB] bg-white">
      <div className="shrink-0 border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 pb-4 pt-4">
        <SkeletonBlock className="h-6 w-24 bg-slate-200" />
        <SkeletonBlock className="mt-2 h-4 w-44" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
        {["Search", "Category", "Location", "Budget", "Rating"].map(
          (label) => (
            <section key={label} className="mb-4">
              <div className="mb-3.5 flex items-center gap-2">
                <SkeletonBlock className="h-4 w-4 bg-slate-200" />
                <SkeletonBlock className="h-3 w-20 bg-slate-200" />
              </div>
              <SkeletonBlock className="h-12 w-full rounded-2xl bg-white" />
            </section>
          ),
        )}
      </div>

      <div className="sticky bottom-0 shrink-0 border-t border-[#E5E7EB] bg-white/95 px-4 py-3">
        <SkeletonButton className="h-12 w-full bg-slate-200" />
      </div>
    </div>
  );
}

function SupplierCardSkeleton() {
  return (
    <article className="flex h-full overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#EFF6FF]">
          <SkeletonBlock className="h-full w-full rounded-none" />
          <SkeletonBadge className="absolute left-4 top-4 w-28 bg-white/95" />
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <SkeletonBadge className="w-24" />
              <SkeletonBlock className="h-4 w-16" />
            </div>
            <SkeletonBlock className="h-6 w-3/4 bg-slate-200" />
            <SkeletonTextLines
              className="mt-3"
              lines={2}
              widths={["w-full", "w-2/3"]}
            />
          </div>

          <div className="grid gap-2.5">
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-4 w-44" />
            <SkeletonBlock className="h-4 w-40" />
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#E5E7EB] pt-4">
            <div className="grid gap-1">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-6 w-24 bg-slate-200" />
              <SkeletonBlock className="h-3 w-16" />
            </div>
            <SkeletonButton className="w-28 bg-slate-200" />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SuppliersLoading() {
  return (
    <LoadingRegion
      label="Loading suppliers..."
      className="flex min-w-0 flex-1 items-start bg-[linear-gradient(180deg,#F9FAFB_0%,#F8FAFC_100%)]"
    >
      <aside
        className="hidden w-[300px] shrink-0 lg:sticky lg:top-[9.5rem] lg:block lg:max-h-[calc(100dvh-10.5rem)] lg:self-start lg:overflow-hidden"
        aria-label="Supplier filters loading"
      >
        <FilterRailSkeleton />
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-7 xl:px-10">
        <div className="flex flex-col gap-6">
          <section className="max-w-full overflow-hidden rounded-[24px] border border-[#E5E7EB]/90 bg-white shadow-sm shadow-slate-200/60">
            <div className="grid gap-4 p-5 sm:p-6 lg:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <SkeletonBadge className="mb-3 w-48" />
                  <h1 className="max-w-3xl text-2xl font-black leading-8 tracking-[-0.04em] text-slate-950 sm:text-3xl sm:leading-tight">
                    Find trusted event suppliers
                  </h1>
                  <SkeletonBlock className="mt-3 h-5 w-full max-w-lg" />
                </div>
                <SkeletonButton className="hidden w-36 lg:block" />
              </div>

              <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
                <SkeletonBlock className="h-12 w-full rounded-2xl bg-[#F9FAFB]" />
                <div className="grid gap-2 sm:grid-cols-[auto_minmax(180px,auto)]">
                  <SkeletonButton className="h-12 w-full lg:hidden" />
                  <SkeletonButton className="h-12 w-full sm:w-[220px]" />
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SupplierCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </main>
    </LoadingRegion>
  );
}
