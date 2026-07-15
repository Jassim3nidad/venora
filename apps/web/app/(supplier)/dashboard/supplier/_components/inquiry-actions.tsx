"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { updateInquiryStatusAction } from "../actions";

export function InquiryActions({
  bookingSupplierId,
}: {
  bookingSupplierId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function respond(status: "confirmed" | "cancelled") {
    setError(null);
    startTransition(async () => {
      const result = await updateInquiryStatusAction({
        bookingSupplierId,
        status,
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => respond("confirmed")}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#1d4ed8] px-3 text-xs font-bold text-white transition hover:bg-[#1e40af] disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Accept
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => respond("cancelled")}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
        >
          <XCircle className="h-3.5 w-3.5" />
          Decline
        </button>
      </div>
      {error ? (
        <p className="max-w-[220px] text-right text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
