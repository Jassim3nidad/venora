import { DashboardPage, Panel } from "@/components/dashboard/enterprise";

function Skeleton({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-[#e5e7eb] ${className}`} />
  );
}

export default function AnalyticsLoading() {
  return (
    <DashboardPage>
      <div className="rounded-[28px] border border-[#dbeafe] bg-white p-6 shadow-sm shadow-slate-200/70">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Panel key={index} className="min-h-[150px]">
            <Skeleton className="h-11 w-11" />
            <Skeleton className="mt-8 h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-28" />
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-5 h-[240px] w-full" />
        </Panel>
        <Panel>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-5 h-[240px] w-full" />
        </Panel>
      </div>

      <Panel>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-5 h-[320px] w-full" />
      </Panel>
    </DashboardPage>
  );
}
