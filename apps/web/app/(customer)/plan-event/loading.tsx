export default function PlanEventLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="h-4 w-28 rounded bg-slate-200" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-10 rounded-lg bg-slate-100" />
            ))}
          </div>
        </aside>
        <main className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
            <div className="h-4 w-20 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-72 max-w-full rounded bg-slate-200" />
            <div className="mt-3 h-4 w-full max-w-xl rounded bg-slate-100" />
          </div>
          <div className="space-y-3 px-4 py-6 sm:px-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-12 rounded-lg bg-slate-100" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
