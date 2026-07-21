export default function CatalogSkeleton() {
  return (
    <div className="w-full">
      {/* Header Skeleton */}
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end border-b border-border pb-6">
        <div className="flex flex-col gap-4">
          <div className="h-10 w-48 bg-border animate-pulse" />
          <div className="h-5 w-64 bg-border animate-pulse" />
        </div>
        <div className="h-8 w-32 bg-border animate-pulse" />
      </div>

      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar Skeleton */}
        <div className="flex w-full flex-col gap-8 md:w-64 shrink-0">
          <div className="flex flex-col gap-4">
            <div className="h-4 w-24 bg-border animate-pulse mb-2" />
            <div className="h-4 w-32 bg-border animate-pulse" />
            <div className="h-4 w-28 bg-border animate-pulse" />
            <div className="h-4 w-32 bg-border animate-pulse" />
          </div>
          <div className="flex flex-col gap-4 mt-4">
            <div className="h-4 w-24 bg-border animate-pulse mb-2" />
            <div className="h-4 w-28 bg-border animate-pulse" />
            <div className="h-4 w-24 bg-border animate-pulse" />
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col w-full">
                <div className="aspect-[3/4] w-full bg-border animate-pulse rounded-sm" />
                <div className="mt-4 flex flex-col gap-2">
                  <div className="h-3 w-16 bg-border animate-pulse" />
                  <div className="h-4 w-3/4 bg-border animate-pulse" />
                  <div className="h-4 w-20 bg-border animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
