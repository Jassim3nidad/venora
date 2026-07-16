export default function SupplierProfileLoading() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 bg-white px-4 pb-28 pt-6 font-sans sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">
      {/* Top Header info */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-end">
        {/* Action Controls */}
        <div className="hidden items-center gap-3 md:flex">
          <div className="h-11 w-32 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      </div>

      {/* Gallery Section Skeleton */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-[300px] md:h-[450px] w-full rounded-3xl overflow-hidden border border-slate-200">
          <div className="md:col-span-2 h-full bg-slate-100 animate-pulse" />
          <div className="hidden md:grid grid-cols-2 col-span-2 gap-3 h-full">
            <div className="bg-slate-100 animate-pulse h-full w-full rounded-xl" />
            <div className="bg-slate-100 animate-pulse h-full w-full rounded-xl" />
            <div className="bg-slate-100 animate-pulse h-full w-full rounded-xl" />
            <div className="bg-slate-100 animate-pulse h-full w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 items-start gap-8 pt-4 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-10">
        {/* Left Column */}
        <div className="min-w-0 space-y-8">
          {/* Identity Header */}
          <div className="relative flex flex-col items-start mb-4 z-10">
            {/* Logo */}
            <div className="relative h-24 w-24 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-md sm:shadow-lg -mt-16 sm:-mt-24 animate-pulse" />
            
            <div className="mt-4 flex w-full flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-5 w-24 rounded bg-slate-100 animate-pulse" />
                <div className="h-5 w-24 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="mt-1 h-9 w-3/4 max-w-[400px] rounded-xl bg-slate-200 animate-pulse md:h-10" />
              <div className="mt-1 h-6 w-full max-w-[600px] rounded bg-slate-100 animate-pulse" />
              
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="h-5 w-32 rounded bg-slate-100 animate-pulse" />
                <div className="h-5 w-40 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
          </div>

          {/* About Section */}
          <section className="space-y-4">
            <div className="h-8 w-48 rounded-lg bg-slate-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-5 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-5 w-4/5 rounded bg-slate-100 animate-pulse" />
              <div className="h-5 w-2/3 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-[20px] border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-slate-200 animate-pulse" />
                  <div className="min-w-0 flex-1 grid gap-2">
                    <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
                    <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="hidden lg:block space-y-6">
          <div className="rounded-[32px] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-slate-200/50 xl:p-8">
            <div className="h-8 w-3/4 rounded-lg bg-slate-200 animate-pulse mb-2" />
            <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse mb-6" />
            <div className="h-14 w-full rounded-2xl bg-slate-100 animate-pulse mb-6" />
            
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-4/5 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
