"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import { cancelBookingAction } from "@/features/booking/application/actions";
import {
  BOOKING_CANCELLATION_REASONS,
  type BookingCancellationReasonCode,
} from "@/features/booking/constants/cancellation-reasons";
import {
  CustomerButton,
  CustomerCard,
  CustomerLinkButton,
} from "@/src/components/customer/CustomerUI";

type BookingCancellationFormProps = {
  bookingId: string;
  venueName: string;
};

export function BookingCancellationForm({
  bookingId,
  venueName,
}: BookingCancellationFormProps) {
  const router = useRouter();
  const [reasonCode, setReasonCode] =
    useState<BookingCancellationReasonCode>("changed_my_mind");
  const [reasonDetail, setReasonDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await cancelBookingAction({
        bookingId,
        reasonCode,
        reasonDetail: reasonDetail.trim() || undefined,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      router.push("/bookings?cancelled=1");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <CustomerCard className="p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            You are about to cancel your booking request for{" "}
            <span className="font-extrabold">{venueName}</span>. This action
            cannot be undone.
          </p>
        </div>

        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-extrabold text-slate-900">
            Why are you cancelling?
          </legend>

          {BOOKING_CANCELLATION_REASONS.map((option) => (
            <label
              key={option.value}
              className={[
                "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                reasonCode === option.value
                  ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                  : "border-[#E5E7EB] bg-[#F9FAFB] text-slate-700 hover:border-[#BFDBFE]",
              ].join(" ")}
            >
              <input
                type="radio"
                name="reasonCode"
                value={option.value}
                checked={reasonCode === option.value}
                onChange={() => setReasonCode(option.value)}
                className="h-4 w-4 accent-[#2563EB]"
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        {reasonCode === "other" ? (
          <label className="mt-4 grid gap-2">
            <span className="text-sm font-bold text-slate-700">
              Tell us more
            </span>
            <textarea
              value={reasonDetail}
              onChange={(event) => setReasonDetail(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Share a short reason for cancelling..."
              className="min-h-28 resize-y rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm font-semibold leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </label>
        ) : null}
      </CustomerCard>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <CustomerButton type="submit" tone="danger" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Confirm cancellation
        </CustomerButton>

        <CustomerLinkButton href={`/bookings/${bookingId}`} tone="secondary">
          Keep booking
        </CustomerLinkButton>
      </div>
    </form>
  );
}
