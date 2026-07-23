"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/dashboard/enterprise";
import { updatePartnershipStatus } from "@/features/suppliers/application/venue-partnership-actions";

export function ReviewPartnershipModal({
  requestId,
  supplierName,
}: {
  requestId: string;
  supplierName: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (status: "active" | "declined") => {
    setIsSubmitting(true);
    setError(null);

    const res = await updatePartnershipStatus(requestId, status);

    setIsSubmitting(false);

    if (res.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      setError(res.error ?? "Failed to update request.");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition"
      >
        Review
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                Review Request
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-6">
                Would you like to accept <strong>{supplierName}</strong> as a preferred partner for your venue?
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleAction("active")}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <MaterialIcon name="check_circle" className="text-lg" />
                  Accept Partnership
                </button>
                <button
                  onClick={() => handleAction("declined")}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                >
                  <MaterialIcon name="cancel" className="text-lg" />
                  Decline Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
