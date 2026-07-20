import { Heart, Search } from "lucide-react";
import {
  LoadingRegion,
  SkeletonBadge,
  SkeletonBlock,
  SkeletonButton,
  SkeletonTextLines,
} from "@/src/components/skeleton/SkeletonPrimitives";

function FavoriteVenueCardSkeleton() {
  return (
    <article className="relative flex h-full overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#EFF6FF]">
          <SkeletonBlock className="h-full w-full rounded-none" />
          <SkeletonBlock className="absolute inset-x-0 bottom-0 h-24 rounded-none bg-slate-200/60" />
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex min-h-[112px] flex-col">
            <div className="mb-3 flex min-h-[28px] flex-wrap items-start gap-2">
              <SkeletonBadge className="w-24" />
              <SkeletonBadge className="w-20" />
              <SkeletonBlock className="h-5 w-14" />
            </div>
            <SkeletonBlock className="h-6 w-full bg-slate-200" />
            <SkeletonBlock className="mt-2 h-6 w-2/3 bg-slate-200" />
          </div>

          <div className="grid min-h-[58px] content-start gap-2.5">
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-4 w-32" />
          </div>

          <div className="mt-auto grid gap-3 border-t border-[#E5E7EB] pt-4">
            <div>
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="mt-2 h-6 w-28 bg-slate-200" />
            </div>
            <SkeletonButton className="h-11 w-full bg-slate-200" />
          </div>
        </div>
      </div>
      <SkeletonBlock className="absolute right-4 top-4 h-10 w-10 rounded-full bg-white/90" />
    </article>
  );
}

export default function FavoritesLoading() {
  return (
    <LoadingRegion label="Loading favorites...">
      <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
                <Heart className="h-3.5 w-3.5 fill-[#2563EB]" />
                Saved shortlist
              </div>

              <SkeletonBlock className="h-12 w-full max-w-3xl bg-slate-200 sm:h-[60px]" />
              <SkeletonTextLines
                className="mt-4 max-w-2xl"
                lines={2}
                widths={["w-full", "w-4/5"]}
              />
            </div>

            <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-xl shadow-slate-200/60">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index}>
                    <SkeletonBlock className="h-3 w-28 bg-slate-200" />
                    <SkeletonBlock className="mt-2 h-9 w-10 bg-slate-200" />
                  </div>
                ))}
              </div>
              <SkeletonBlock className="mt-4 h-4 w-56 max-w-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
              Collection
            </p>
            <SkeletonBlock className="mt-2 h-8 w-40 bg-slate-200" />
          </div>

          <div className="inline-flex w-fit items-center rounded-full border border-[#E5E7EB] bg-white p-1">
            <SkeletonButton className="h-10 w-36 rounded-full bg-[#EFF6FF]" />
            <SkeletonButton className="h-10 w-40 rounded-full bg-white" />
          </div>
        </div>

        <div className="mb-6 flex justify-end">
          <span className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 text-sm font-extrabold text-[#1D4ED8]">
            <Search className="h-4 w-4" />
            Browse venues
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <FavoriteVenueCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </LoadingRegion>
  );
}
