"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { verifyPayoutAccountAction } from "../application/admin-withdrawal-actions";

/**
 * Admin control for approving a payout destination.
 *
 * Verification is the gate that stops money leaving to an unchecked
 * account: request_withdrawal() refuses any account with a NULL
 * verified_at, and editing the underlying number resets it. Confirm the
 * account holder out of band before clicking this.
 */
export function VerifyPayoutAccountButton({
  payoutAccountId,
}: {
  payoutAccountId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const reference = window.prompt(
            "Reference for this verification (e.g. ticket or document id). Optional:",
            "",
          );
          // prompt() returns null on Cancel — treat that as "don't verify".
          if (reference === null) return;

          setError(null);
          startTransition(async () => {
            const result = await verifyPayoutAccountAction({
              payoutAccountId,
              reference: reference.trim() || undefined,
            });
            if (result.error) {
              setError(result.error.message);
              return;
            }
            router.refresh();
          });
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5" />
        )}
        Verify
      </button>

      {error ? (
        <p className="max-w-xs text-right text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
