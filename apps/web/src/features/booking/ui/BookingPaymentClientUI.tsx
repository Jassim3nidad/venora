"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, RefreshCw } from "lucide-react";
import { startBookingPaymentAction } from "@/src/features/booking/application/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@venora/ui";

type BookingPaymentClientUIProps = {
  bookingId: string;
  venueName: string;
  depositAmount: number;
  formattedDeposit: string;
  status:
    | "payable"
    | "pending_provider"
    | "paid"
    | "failed"
    | "expired"
    | "not_payable";
  providerStatusLabel?: string | undefined;
  providerReference?: string | undefined;
  providerName?: string | undefined;
  startedAt?: string | undefined;
};

export function BookingPaymentClientUI({
  bookingId,
  venueName,
  depositAmount,
  formattedDeposit,
  status,
  providerStatusLabel,
  providerReference,
  providerName,
  startedAt,
}: BookingPaymentClientUIProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCreatePayment = () => {
    setError(null);
    startTransition(async () => {
      const result = await startBookingPaymentAction({
        bookingId,
        provider: "paymongo", // Using default provider logic
      });

      if (result.error) {
        setError(
          result.error.message ||
            "We couldn't start your payment. Please try again.",
        );
        return;
      }

      const checkoutUrl = result.data?.checkoutUrl;
      if (checkoutUrl && /^https?:\/\//.test(checkoutUrl)) {
        window.location.assign(checkoutUrl);
        return;
      }

      setIsDialogOpen(false);
      router.refresh();
    });
  };

  const handleRefreshStatus = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  if (status === "pending_provider") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-amber-900">
              Payment processing
            </h3>
            <p className="mt-1 text-sm text-amber-800">
              We’re waiting for {providerName || "the provider"} to confirm your
              payment.
            </p>
            {(providerReference || startedAt) && (
              <div className="mt-3 grid gap-1 text-sm text-amber-700/80">
                {providerReference && <p>Reference: {providerReference}</p>}
                {startedAt && <p>Started: {startedAt}</p>}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-amber-200/50">
          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-5 text-sm font-bold text-amber-900 transition hover:bg-amber-200 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Check payment status
          </button>
        </div>
      </div>
    );
  }

  if (status === "payable" || status === "failed" || status === "expired") {
    const isRetry = status === "failed" || status === "expired";
    return (
      <>
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#2563EB] px-8 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
        >
          <CreditCard className="h-4 w-4" />
          {isRetry ? "Try payment again" : `Pay ${formattedDeposit} deposit`}
        </button>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => !isPending && setIsDialogOpen(open)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Pay {formattedDeposit} deposit?
              </DialogTitle>
              <DialogDescription className="text-base text-slate-600 mt-3 space-y-3">
                <p>
                  This deposit is for your booking at{" "}
                  <span className="font-semibold text-slate-900">
                    {venueName}
                  </span>
                  .
                </p>
                <p>You’ll continue to PayMongo to complete the payment.</p>
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <DialogFooter className="mt-6 gap-3 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                autoFocus
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleCreatePayment}
                disabled={isPending}
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#2563EB] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue to PayMongo
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
}
