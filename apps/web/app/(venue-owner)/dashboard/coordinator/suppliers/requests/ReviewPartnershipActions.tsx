"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/dashboard/enterprise";
import { updatePartnershipStatus } from "@/features/suppliers/application/venue-partnership-actions";
import Link from "next/link";

export function ReviewPartnershipActions({
  requestId,
  supplierId,
}: {
  requestId: string;
  supplierId: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);

  const handleAction = async (status: "active" | "declined") => {
    setIsSubmitting(true);
    setError(null);

    const res = await updatePartnershipStatus(requestId, status);

    setIsSubmitting(false);

    if (res.success) {
      if (status === "active") {
        setIsAccepted(true);
      } else {
        router.refresh();
      }
    } else {
      setError(res.error ?? "Failed to update request.");
    }
  };

  if (isAccepted) {
    return (
      <div className="w-full flex flex-col gap-3 rounded-xl bg-emerald-50 p-4 border border-emerald-100 shadow-sm animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-2 text-emerald-800 font-bold">
          <MaterialIcon name="check_circle" className="text-lg" /> 
          Partnership Accepted!
        </div>
        <p className="text-sm text-emerald-700 font-medium">
          Next step: Propose a commercial agreement so you can include them in your venue's packages.
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            href={`/dashboard/coordinator/suppliers/${supplierId}?action=propose-agreement`}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
          >
            <MaterialIcon name="description" className="text-sm" />
            Propose Agreement
          </Link>
          <button 
            onClick={() => router.refresh()} 
            className="text-sm font-bold text-emerald-700 hover:underline px-2"
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 mb-1">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2 justify-end w-full">
        <button
          onClick={() => handleAction("declined")}
          disabled={isSubmitting}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          <MaterialIcon name="cancel" className="text-sm" />
          Decline
        </button>
        <button
          onClick={() => handleAction("active")}
          disabled={isSubmitting}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          <MaterialIcon name="check_circle" className="text-sm" />
          Accept
        </button>
      </div>
    </div>
  );
}
