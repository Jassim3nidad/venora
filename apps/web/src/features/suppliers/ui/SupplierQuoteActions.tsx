"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  acceptSupplierQuoteAction,
  declineSupplierQuoteAction,
} from "../application/actions";

export function SupplierQuoteActions({
  quoteId,
  supplierName,
  totalAmount,
}: {
  quoteId: string;
  supplierName: string;
  totalAmount: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAction = (
    actionFn:
      typeof acceptSupplierQuoteAction | typeof declineSupplierQuoteAction,
    label: "accept" | "decline",
  ) => {
    if (!quoteId) return;
    const confirmed = window.confirm(
      label === "accept"
        ? `Accept this Service Proposal from ${supplierName} for ${totalAmount}?`
        : `Decline this Service Proposal from ${supplierName}?`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await actionFn({ quoteId });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="grid gap-3">
      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => handleAction(acceptSupplierQuoteAction, "accept")}
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Accept Proposal
      </button>
      <button
        type="button"
        onClick={() => handleAction(declineSupplierQuoteAction, "decline")}
        disabled={isPending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 text-sm font-extrabold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        Decline Proposal
      </button>
    </div>
  );
}
