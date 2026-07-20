import {
  LoadingRegion,
  SkeletonBadge,
  SkeletonBlock,
  SkeletonButton,
  SkeletonTextLines,
} from "@/src/components/skeleton/SkeletonPrimitives";

function GallerySkeleton() {
  return (
    <div className="space-y-4">
      <div className="relative grid h-[300px] w-full grid-cols-1 gap-3 overflow-hidden rounded-3xl border border-[var(--border-default)] md:h-[450px] md:grid-cols-4">
        <SkeletonBlock className="h-full rounded-none md:col-span-2" />
        <div className="hidden h-full grid-cols-2 gap-3 md:col-span-2 md:grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-full rounded-none" />
          ))}
        </div>
        <SkeletonButton className="absolute bottom-4 right-4 h-10 w-36 rounded-xl bg-white/90" />
      </div>
    </div>
  );
}

function InfoTileSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <SkeletonBadge className="w-28" />
      <SkeletonBlock className="mt-3 h-6 w-40 bg-slate-200" />
      <SkeletonBlock className="mt-2 h-4 w-44" />
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="grid gap-0">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex gap-4 border-l-2 border-[#DBEAFE] pb-6 last:border-transparent last:pb-0"
        >
          <SkeletonBlock className="-ml-[13px] h-6 w-6 shrink-0 rounded-full bg-slate-200" />
          <div className="-mt-1.5 flex-1">
            <SkeletonBlock className="h-4 w-32 bg-slate-200" />
            <SkeletonBlock className="mt-2 h-3 w-28" />
            <SkeletonBlock className="mt-3 h-12 w-full rounded-xl bg-[#F9FAFB]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm">
      <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] p-4">
        <SkeletonBlock className="h-5 w-48 bg-slate-200" />
        <SkeletonBlock className="mt-2 h-3 w-64" />
      </div>
      <div className="space-y-4 p-4">
        <div className="mr-auto max-w-[78%] rounded-2xl bg-[#F9FAFB] p-4">
          <SkeletonTextLines lines={2} widths={["w-64", "w-44"]} />
        </div>
        <div className="ml-auto max-w-[78%] rounded-2xl bg-[#EFF6FF] p-4">
          <SkeletonTextLines lines={2} widths={["w-56", "w-36"]} />
        </div>
        <div className="mr-auto max-w-[70%] rounded-2xl bg-[#F9FAFB] p-4">
          <SkeletonTextLines lines={1} widths={["w-48"]} />
        </div>
      </div>
      <div className="border-t border-[#E5E7EB] p-4">
        <SkeletonBlock className="h-12 w-full rounded-2xl bg-[#F9FAFB]" />
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <div className="flex flex-col gap-5 rounded-[24px] border border-[#BFDBFE] bg-white p-6 shadow-sm shadow-blue-200/50">
        <SkeletonBlock className="h-7 w-32 bg-slate-200" />
        <div className="grid gap-3">
          <SkeletonButton className="h-12 w-full bg-slate-200" />
          <SkeletonButton className="h-12 w-full" />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-slate-200/60">
        <SkeletonBlock className="h-7 w-44 bg-slate-200" />
        <div className="space-y-3">
          <div className="flex justify-between gap-4">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-28 bg-slate-200" />
          </div>
          <div className="flex justify-between gap-4">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-4 w-24 bg-slate-200" />
          </div>
        </div>
        <div className="h-px bg-[#E5E7EB]" />
        <SkeletonBlock className="h-3 w-28 bg-slate-200" />
        <SkeletonTextLines lines={2} widths={["w-full", "w-3/4"]} />
      </div>
    </aside>
  );
}

export default function BookingDetailLoading() {
  return (
    <LoadingRegion
      label="Loading booking details..."
      className="mx-auto max-w-7xl space-y-6 px-4 pb-28 pt-6 font-sans sm:px-6 sm:pt-8 lg:px-8 lg:pb-8"
    >
      <SkeletonButton className="h-10 w-40 rounded-full bg-white" />

      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBadge className="w-36" />
              <SkeletonBadge className="w-28" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
            <SkeletonBlock className="h-10 w-full max-w-3xl bg-slate-200 md:h-11" />
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <SkeletonBlock className="h-5 w-48" />
              <SkeletonBlock className="h-5 w-28" />
            </div>
          </div>
          <SkeletonButton className="h-11 w-full sm:w-44" />
        </div>
      </div>

      <GallerySkeleton />

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <section className="space-y-4">
            <SkeletonBlock className="h-7 w-36 bg-slate-200" />
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoTileSkeleton />
              <InfoTileSkeleton />
            </div>
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section className="space-y-4">
            <SkeletonBlock className="h-7 w-44 bg-slate-200" />
            <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <SkeletonBlock className="h-6 w-52 bg-slate-200" />
                  <SkeletonTextLines className="mt-3" lines={2} />
                </div>
                <SkeletonBlock className="h-10 w-32 bg-slate-200" />
              </div>
            </div>
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section className="space-y-4">
            <SkeletonBlock className="h-7 w-52 bg-slate-200" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock
                  key={index}
                  className="h-[52px] rounded-2xl bg-[#F9FAFB]"
                />
              ))}
            </div>
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-48 bg-slate-200" />
              <SkeletonTextLines
                className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                lines={3}
              />
            </div>
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-32 bg-slate-200" />
              <SkeletonTextLines
                className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                lines={4}
              />
            </div>
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section className="space-y-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <SkeletonBlock className="h-7 w-56 bg-slate-200" />
              <SkeletonBlock className="h-4 w-52" />
            </div>
            <SkeletonBlock className="h-[300px] w-full rounded-3xl" />
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section className="space-y-4">
            <SkeletonBlock className="h-7 w-52 bg-slate-200" />
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonTextLines
                className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                lines={3}
              />
              <SkeletonTextLines
                className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                lines={3}
              />
            </div>
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section className="space-y-4">
            <SkeletonBlock className="h-7 w-40 bg-slate-200" />
            <TimelineSkeleton />
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section className="space-y-4">
            <SkeletonBlock className="h-7 w-64 bg-slate-200" />
            <ConversationSkeleton />
          </section>
        </div>

        <SidebarSkeleton />
      </div>
    </LoadingRegion>
  );
}
