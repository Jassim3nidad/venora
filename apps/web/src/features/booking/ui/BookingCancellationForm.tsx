"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cancelBookingAction } from "@/src/features/booking/application/actions";
import {
  BOOKING_CANCELLATION_REASONS,
  type BookingCancellationReasonCode,
} from "@/src/features/booking/constants/cancellation-reasons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@venora/ui";
import { format } from "date-fns";
import { BookingStatusBadge } from "./booking-status-badge";
import Link from "next/link";

type BookingSummary = {
  id: string;
  status: string;
  eventDate: string;
  eventStartTime?: string;
  guestCount: number;
  venueName: string;
  venueSlug?: string;
  coverImageUrl?: string;
  packageName: string;
  totalAmount?: number;
  depositAmount?: number;
};

type BookingCancellationFormProps = {
  booking: BookingSummary;
};

export function BookingCancellationForm({
  booking,
}: BookingCancellationFormProps) {
  const [reasonCode, setReasonCode] =
    useState<BookingCancellationReasonCode | null>(null);
  const [reasonDetail, setReasonDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formattedDate = booking.eventDate
    ? format(new Date(booking.eventDate), "MMMM d, yyyy")
    : "";

  const timeString = booking.eventStartTime
    ? (() => {
        const [h, m] = booking.eventStartTime.split(":");
        const date = new Date();
        date.setHours(parseInt(h || "0"), parseInt(m || "0"));
        return format(date, "h:mm a");
      })()
    : "";

  const isPendingRequest = booking.status === "pending";
  const isApprovedUnpaid = booking.status === "approved";

  let warningTitle = "Cancellation details";
  let warningText =
    "Your booking is confirmed. Cancelling may be subject to the venue’s cancellation policy. Any eligible refund will be processed after review.";

  if (isPendingRequest) {
    warningTitle = "Before you continue";
    warningText =
      "This request is still pending approval. Withdrawing it will close the request and notify the venue. No payment or refund is involved.";
  } else if (isApprovedUnpaid) {
    warningTitle = "Before you continue";
    warningText =
      "Cancelling will release this booking and notify the venue. No payment has been charged.";
  }

  const handleInitialSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reasonCode) {
      setError("Select a reason before continuing.");
      return;
    }
    if (reasonCode === "other" && reasonDetail.trim().length < 5) {
      setError("Please describe your reason (at least 5 characters).");
      return;
    }
    setError(null);
    setIsDialogOpen(true);
  };

  const handleConfirmCancellation = () => {
    if (!reasonCode) return;

    startTransition(async () => {
      const result = await cancelBookingAction({
        bookingId: booking.id,
        reasonCode,
        reasonDetail: reasonDetail.trim() || undefined,
      });

      if (result.error) {
        setIsDialogOpen(false);
        setError(
          result.error.message ||
            "We couldn't update your booking. Please try again.",
        );
        return;
      }

      setIsDialogOpen(false);
      setIsSuccess(true);
    });
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2
          className="mb-2 text-2xl font-bold tracking-tight text-slate-900"
          tabIndex={-1}
        >
          {isPendingRequest ? "Booking request withdrawn" : "Booking cancelled"}
        </h2>
        <p className="mb-8 max-w-md text-base text-slate-600">
          {isPendingRequest
            ? `Your request for ${booking.venueName} has been closed, and the venue has been notified.`
            : "Your booking has been cancelled. Review the booking details for refund or next-step information."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full sm:w-auto">
          <Link
            href="/bookings"
            className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Return to bookings
          </Link>
          <Link
            href={`/bookings/${booking.id}`}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
          >
            View booking details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6">
        {/* Booking Summary */}
        <div className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          {booking.coverImageUrl && (
            <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100 hidden sm:block relative">
              <Image
                src={booking.coverImageUrl}
                alt={booking.venueName}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {booking.venueName}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
              <p>
                {formattedDate} {timeString ? `· ${timeString}` : ""}
              </p>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
              <p>
                {booking.guestCount} guests · {booking.packageName}
              </p>
            </div>
            <div className="mt-3">
              <BookingStatusBadge status={booking.status as any} />
            </div>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <h4 className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            {warningTitle}
          </h4>
          <p className="mt-1 text-sm text-amber-800 leading-relaxed">
            {warningText}
          </p>
        </div>

        {/* Cancellation Form */}
        <form onSubmit={handleInitialSubmit} className="grid gap-6" noValidate>
          <fieldset
            className="grid gap-3"
            aria-describedby={error ? "form-error" : undefined}
          >
            <legend className="mb-3 text-lg font-bold text-slate-900">
              Why are you {isPendingRequest ? "withdrawing" : "cancelling"}?
            </legend>

            {BOOKING_CANCELLATION_REASONS.map((option) => {
              const isSelected = reasonCode === option.value;
              return (
                <label
                  key={option.value}
                  className={[
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-4 text-sm font-semibold transition ring-offset-white focus-within:ring-2 focus-within:ring-[#2563EB]/40 focus-within:ring-offset-2",
                    isSelected
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                      : "border-[#E5E7EB] bg-white text-slate-700 hover:border-[#BFDBFE] hover:bg-slate-50",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="reasonCode"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => {
                      setReasonCode(option.value);
                      setError(null);
                    }}
                    className="h-4 w-4 shrink-0 accent-[#2563EB] focus:outline-none"
                  />
                  {option.label}
                </label>
              );
            })}
          </fieldset>

          {reasonCode === "other" && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
              <label
                htmlFor="reasonDetail"
                className="text-sm font-bold text-slate-700"
              >
                Tell us more
                <span className="block text-xs font-normal text-slate-500 mt-0.5">
                  This is optional and helps the venue understand your decision.
                </span>
              </label>
              <textarea
                id="reasonDetail"
                value={reasonDetail}
                onChange={(event) => setReasonDetail(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Share any additional details..."
                className="w-full resize-y rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm font-medium leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </div>
          )}

          {error && (
            <div
              id="form-error"
              className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700"
            >
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse sm:justify-start pt-4 border-t border-slate-100">
            <Link
              href={`/bookings/${booking.id}`}
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full bg-[#2563EB] px-8 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8] order-1 sm:order-2"
            >
              {isPendingRequest ? "Keep request" : "Keep booking"}
            </Link>

            <button
              type="submit"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-red-600 hover:border-red-200 order-2 sm:order-1"
            >
              {isPendingRequest ? "Withdraw request" : "Continue cancellation"}
            </button>
          </div>
        </form>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => !isPending && setIsDialogOpen(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isPendingRequest
                ? "Withdraw this booking request?"
                : "Cancel this booking?"}
            </DialogTitle>
            <DialogDescription className="text-base text-slate-600 mt-3 space-y-3">
              {isPendingRequest ? (
                <>
                  <p>
                    You’re about to withdraw your request for{" "}
                    <span className="font-semibold text-slate-900">
                      {booking.venueName}
                    </span>{" "}
                    on{" "}
                    <span className="font-semibold text-slate-900">
                      {formattedDate}
                    </span>
                    .
                  </p>
                  <p>
                    The venue will be notified, and this request cannot be
                    reopened.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    You’re about to cancel your booking for{" "}
                    <span className="font-semibold text-slate-900">
                      {booking.venueName}
                    </span>{" "}
                    on{" "}
                    <span className="font-semibold text-slate-900">
                      {formattedDate}
                    </span>
                    .
                  </p>
                  <p>{warningText}</p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 gap-3 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              disabled={isPending}
              className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              autoFocus
            >
              Go back
            </button>
            <button
              type="button"
              onClick={handleConfirmCancellation}
              disabled={isPending}
              className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-red-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {isPendingRequest
                ? "Yes, withdraw request"
                : "Yes, cancel booking"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
