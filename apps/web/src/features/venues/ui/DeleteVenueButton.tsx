"use client";

import { useState, useTransition } from "react";

export default function DeleteVenueButton({
  onDelete,
}: {
  onDelete: () => Promise<{ error?: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await onDelete();
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-100 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
      >
        Delete Venue
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !isPending && setIsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[24px] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900">Delete Venue</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Are you sure you want to delete this venue? This action cannot be
              undone. All data, images, and packages associated with this venue
              will be permanently removed.
            </p>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
