function Pulse({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-slate-100 ${className}`}
    />
  );
}

function InfoSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5">
      <Pulse className="h-10 w-10 shrink-0 rounded-[14px] bg-slate-200" />
      <div className="min-w-0 flex-1 space-y-2">
        <Pulse className="h-3 w-20 bg-slate-200" />
        <Pulse className="h-4 w-28" />
      </div>
    </div>
  );
}

function ServiceCardSkeleton() {
  return (
    <article className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/70">
      <Pulse className="mb-4 h-5 w-24 rounded-full" />
      <Pulse className="h-6 w-3/4 bg-slate-200" />
      <Pulse className="mt-3 h-4 w-40" />
      <div className="mt-5 space-y-2.5">
        <Pulse className="h-4 w-full" />
        <Pulse className="h-4 w-5/6" />
        <Pulse className="h-4 w-2/3" />
      </div>
      <Pulse className="mt-6 h-11 w-full rounded-2xl bg-slate-200" />
    </article>
  );
}

function PortfolioCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70">
      <Pulse className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-5 sm:p-6">
        <Pulse className="h-5 w-3/4 bg-slate-200" />
        <Pulse className="h-3 w-1/2" />
        <Pulse className="h-3 w-2/3" />
        <div className="border-t border-slate-100 pt-4">
          <Pulse className="h-4 w-32" />
        </div>
      </div>
    </article>
  );
}

function RequestCardSkeleton() {
  return (
    <aside className="w-full lg:w-auto lg:self-stretch">
      <div className="lg:sticky lg:top-[9.5rem]">
        <div className="w-full min-w-0 rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-lg shadow-slate-200/40">
          <Pulse className="h-3 w-24 bg-slate-200" />
          <Pulse className="mt-2 h-7 w-40 bg-slate-200" />
          <Pulse className="mt-6 h-5 w-56 bg-slate-200" />
          <div className="mt-3 space-y-2">
            <Pulse className="h-4 w-full" />
            <Pulse className="h-4 w-4/5" />
          </div>
          <div className="mt-5 space-y-3">
            <Pulse className="h-4 w-44" />
            <Pulse className="h-4 w-48" />
          </div>
          <Pulse className="mt-6 h-11 w-full rounded-2xl bg-slate-200" />
        </div>
      </div>
    </aside>
  );
}

export default function SupplierProfileLoading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto max-w-7xl space-y-8 bg-white px-4 pb-28 pt-6 font-sans sm:px-6 sm:pt-8 lg:px-8 lg:pb-12"
    >
      <span className="sr-only">Loading supplier profile...</span>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-end">
        <div className="hidden items-center gap-3 md:flex">
          <Pulse className="h-11 w-32 rounded-xl" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative grid h-[300px] w-full grid-cols-1 gap-3 overflow-hidden rounded-3xl border border-[var(--border-default)] md:h-[450px] md:grid-cols-4">
          <Pulse className="h-full rounded-none md:col-span-2" />
          <div className="hidden h-full grid-cols-2 gap-3 md:col-span-2 md:grid">
            {[0, 1, 2, 3].map((item) => (
              <Pulse key={item} className="h-full w-full rounded-xl" />
            ))}
          </div>
          <Pulse className="absolute bottom-4 right-4 h-10 w-36 rounded-xl bg-white/90" />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 pt-4 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-10">
        <div className="min-w-0 space-y-8">
          <section className="relative z-10 mb-4 flex flex-col items-start">
            <Pulse className="-mt-16 h-24 w-24 shrink-0 rounded-full border-4 border-white bg-slate-200 shadow-md sm:-mt-24 sm:h-32 sm:w-32 sm:shadow-lg" />
            <div className="mt-4 flex w-full flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Pulse className="h-6 w-28 rounded-full" />
                <Pulse className="h-6 w-24 rounded-full" />
              </div>
              <Pulse className="mt-2 h-9 w-4/5 max-w-[480px] rounded-xl bg-slate-200 md:h-10" />
              <Pulse className="mt-2 h-5 w-full max-w-2xl" />
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Pulse className="h-5 w-32" />
                <Pulse className="h-5 w-48" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <Pulse className="h-8 w-48 bg-slate-200" />
            <div className="space-y-2">
              <Pulse className="h-5 w-full" />
              <Pulse className="h-5 w-full" />
              <Pulse className="h-5 w-4/5" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <InfoSkeleton key={item} />
              ))}
            </div>
          </section>

          <div className="h-px bg-slate-200/60" />

          <section className="space-y-5">
            <div>
              <Pulse className="h-8 w-56 bg-slate-200" />
              <Pulse className="mt-2 h-4 w-40" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ServiceCardSkeleton />
              <ServiceCardSkeleton />
            </div>
          </section>

          <div className="h-px bg-slate-200/60" />

          <section className="space-y-5">
            <div>
              <Pulse className="h-8 w-44 bg-slate-200" />
              <Pulse className="mt-2 h-4 w-72 max-w-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PortfolioCardSkeleton />
              <PortfolioCardSkeleton />
              <PortfolioCardSkeleton />
            </div>
          </section>

          <div className="h-px bg-slate-200/60" />

          <section className="space-y-5">
            <Pulse className="h-8 w-72 max-w-full bg-slate-200" />
            <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70">
              <div className="grid gap-4 border-b border-[#E5E7EB] p-5 sm:grid-cols-2 sm:p-6">
                <div className="space-y-2">
                  <Pulse className="h-3 w-24 bg-slate-200" />
                  <Pulse className="h-4 w-40" />
                </div>
                <div className="space-y-2">
                  <Pulse className="h-3 w-28 bg-slate-200" />
                  <Pulse className="h-4 w-24" />
                </div>
              </div>
              <Pulse className="h-[220px] w-full rounded-none sm:h-[260px]" />
            </div>
          </section>

          <div className="h-px bg-slate-200/60" />

          <section className="space-y-5">
            <Pulse className="h-8 w-28 bg-slate-200" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((item) => (
                <article
                  key={item}
                  className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/70"
                >
                  <Pulse className="mb-4 h-4 w-28 bg-slate-200" />
                  <Pulse className="h-4 w-full" />
                  <Pulse className="mt-2 h-4 w-3/4" />
                  <div className="mt-4 flex items-center gap-3">
                    <Pulse className="h-8 w-8 rounded-full bg-slate-200" />
                    <div className="space-y-2">
                      <Pulse className="h-3 w-24" />
                      <Pulse className="h-3 w-20" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <RequestCardSkeleton />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white p-4 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Pulse className="h-3 w-20 bg-slate-200" />
            <Pulse className="h-6 w-28 bg-slate-200" />
          </div>
          <Pulse className="h-12 flex-1 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
