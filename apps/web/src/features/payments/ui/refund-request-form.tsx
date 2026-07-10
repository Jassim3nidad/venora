"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { CustomerButton } from "@/src/components/customer/CustomerUI";

/**
 * Refund request control for a cancelled, paid booking.
 * Posts to POST /api/bookings/:id/refund; the refund then settles
 * asynchronously via the provider webhook.
 */
export function RefundRequestForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (success) {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
        {success}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Reason (optional)
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Tell us why you are requesting a refund"
          className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <CustomerButton
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const response = await fetch(`/api/bookings/${bookingId}/refund`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
              });
              const json = await response.json();
              if (!response.ok || json.error) {
                setError(json.error?.message ?? "Refund request failed. Please try again.");
                return;
              }
              setSuccess(
                json.data.status === "succeeded"
                  ? "Your refund has been processed."
                  : "Your refund request was submitted. We'll notify you once the provider confirms it.",
              );
              router.refresh();
            } catch {
              setError("Refund request failed. Please try again.");
            }
          });
        }}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        Request Refund
      </CustomerButton>
    </div>
  );
}
