"use client";

export default function PlanEventError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-950">
          We could not load the planner
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Please try again. If a local draft cannot be restored, you can begin a
          new plan.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
