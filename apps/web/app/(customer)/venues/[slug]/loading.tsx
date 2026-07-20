import {
  LoadingRegion,
  SkeletonBadge,
  SkeletonBlock,
  SkeletonButton,
  SkeletonTextLines,
} from "@/src/components/skeleton/SkeletonPrimitives";

function VenueGallerySkeleton() {
  return (
    <div className="space-y-4">
      <div className="relative grid h-[300px] w-full grid-cols-1 gap-3 overflow-hidden rounded-3xl border border-[var(--border-default)] md:h-[450px] md:grid-cols-4">
        <SkeletonBlock className="h-full rounded-none md:col-span-2" />
        <div className="hidden h-full grid-cols-2 gap-3 md:col-span-2 md:grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-full w-full rounded-none" />
          ))}
        </div>
        <SkeletonButton className="absolute bottom-4 right-4 h-10 w-36 rounded-xl bg-white/90" />
      </div>
    </div>
  );
}

function SectionHeading({ width = "w-44" }: { width?: string }) {
  return <SkeletonBlock className={`h-7 ${width} bg-slate-200`} />;
}

function BookingCardSkeleton() {
  return (
    <div className="sticky top-[9.5rem] hidden w-full rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-slate-200/60 lg:block">
      <SkeletonBlock className="h-8 w-44 bg-slate-200" />
      <SkeletonBlock className="mt-2 h-4 w-20" />
      <div className="my-5 h-px bg-[#E5E7EB]" />
      <div className="space-y-4">
        <div>
          <SkeletonBlock className="mb-2 h-3 w-20 bg-slate-200" />
          <SkeletonButton className="w-full bg-[#F9FAFB]" />
        </div>
        <div>
          <SkeletonBlock className="mb-2 h-3 w-24 bg-slate-200" />
          <SkeletonButton className="w-full bg-[#F9FAFB]" />
        </div>
        <div>
          <div className="mb-2 flex justify-between">
            <SkeletonBlock className="h-3 w-24 bg-slate-200" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <SkeletonBlock className="h-2 w-full rounded-full" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <div className="flex justify-between">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-4 w-24 bg-slate-200" />
        </div>
        <div className="flex justify-between">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-4 w-20 bg-slate-200" />
        </div>
      </div>
      <SkeletonButton className="mt-6 h-12 w-full bg-slate-200" />
      <SkeletonBlock className="mx-auto mt-4 h-3 w-36" />
    </div>
  );
}

export default function VenueDetailLoading() {
  return (
    <LoadingRegion
      label="Loading venue details..."
      className="mx-auto max-w-7xl space-y-8 px-4 pb-28 pt-6 font-sans sm:px-6 sm:pt-8 lg:px-8 lg:pb-8"
    >
      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBadge className="w-28" />
              <SkeletonBadge className="w-24" />
            </div>
            <SkeletonBlock className="h-10 w-full max-w-3xl bg-slate-200 md:h-11" />
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <SkeletonBlock className="h-5 w-72 max-w-full" />
              <SkeletonBlock className="h-5 w-36" />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <SkeletonButton className="w-full sm:w-28" />
            <SkeletonButton className="w-full sm:w-32" />
          </div>
        </div>
      </div>

      <VenueGallerySkeleton />

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <section className="space-y-4">
            <SectionHeading />
            <SkeletonTextLines lines={4} />
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section className="space-y-4">
            <SectionHeading width="w-56" />
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

          <section className="space-y-4">
            <SectionHeading width="w-52" />
            <SkeletonBlock className="h-4 w-3/4" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <article
                  key={index}
                  className="rounded-3xl border border-[var(--border-default)] bg-white p-5 shadow-sm"
                >
                  <div className="flex justify-between gap-4">
                    <SkeletonBlock className="h-6 w-36 bg-slate-200" />
                    <SkeletonBlock className="h-6 w-24 bg-slate-200" />
                  </div>
                  <SkeletonTextLines className="mt-4" lines={3} />
                  <div className="mt-5 border-t border-[#E5E7EB] pt-4">
                    <SkeletonBlock className="h-3 w-24 bg-slate-200" />
                    <SkeletonTextLines className="mt-3" lines={3} />
                  </div>
                </article>
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
            <div className="space-y-3 md:col-span-2">
              <SkeletonBlock className="h-4 w-44 bg-slate-200" />
              <SkeletonTextLines
                className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                lines={2}
              />
            </div>
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section className="space-y-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <SectionHeading width="w-60" />
              <SkeletonBlock className="h-4 w-56" />
            </div>
            <SkeletonBlock className="h-[300px] w-full rounded-3xl" />
          </section>

          <div className="h-px bg-[#E5E7EB]" />

          <section className="flex flex-col items-start justify-between gap-5 rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-slate-200/60 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <SkeletonBlock className="h-14 w-14 rounded-2xl bg-slate-200" />
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-24 bg-slate-200" />
                <SkeletonBlock className="h-5 w-40 bg-slate-200" />
                <SkeletonBlock className="h-4 w-52" />
              </div>
            </div>
            <SkeletonBlock className="h-10 w-36" />
          </section>
        </div>

        <div className="space-y-4 lg:col-span-1 lg:self-stretch">
          <BookingCardSkeleton />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-default)] bg-[var(--bg-base)]/95 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.15)] backdrop-blur-lg lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <SkeletonBlock className="h-6 w-28 bg-slate-200" />
            <SkeletonBlock className="h-3 w-44" />
          </div>
          <SkeletonButton className="h-12 w-28 shrink-0 bg-slate-200" />
        </div>
      </div>
    </LoadingRegion>
  );
}
