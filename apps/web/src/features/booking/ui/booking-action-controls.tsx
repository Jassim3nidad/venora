"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, CreditCard, Loader2, Star, XCircle } from "lucide-react";
import {
  approveBookingAction,
  cancelBookingAction,
  completeBookingAction,
  declineBookingAction,
  startBookingPaymentAction,
  submitBookingReviewAction,
} from "../application/actions";
import { CustomerButton } from "@/src/components/customer/CustomerUI";
import { ReviewPhotoUploader } from "@/features/reviews/ui/ReviewPhotoUploader";
import { attachReviewPhotosAction } from "@/features/reviews/application/actions";
import type { UploadedPhoto } from "@/features/reviews/hooks/useReviewPhotoUpload";

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
      {message}
    </p>
  );
}

export function CustomerCancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      <ErrorMessage message={error} />
      <CustomerButton
        type="button"
        tone="danger"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await cancelBookingAction({ bookingId });
            if (result.error) {
              setError(result.error.message);
              return;
            }
            router.refresh();
          });
        }}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
        Cancel Booking
      </CustomerButton>
    </div>
  );
}

export function StartPaymentForm({
  bookingId,
  compact = false,
}: {
  bookingId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<"paymongo" | "maya" | "stripe">("paymongo");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      {!compact ? (
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Payment provider
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as "paymongo" | "maya" | "stripe")}
            className="h-12 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          >
            <option value="paymongo">PayMongo</option>
            <option value="maya">Maya</option>
            <option value="stripe">Stripe</option>
          </select>
        </label>
      ) : null}

      <ErrorMessage message={error} />

      <CustomerButton
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startBookingPaymentAction({ bookingId, provider });
            if (result.error) {
              setError(result.error.message);
              return;
            }
            router.push(`/bookings/${bookingId}/confirmation`);
            router.refresh();
          });
        }}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        Pay Deposit
      </CustomerButton>
    </div>
  );
}

export function OwnerBookingDecisionForm({
  bookingId,
  suggestedTotal,
  suggestedDeposit,
}: {
  bookingId: string;
  suggestedTotal: number;
  suggestedDeposit: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await approveBookingAction({
              bookingId,
              totalAmount: Number(formData.get("totalAmount")),
              depositAmount: Number(formData.get("depositAmount")),
              note: String(formData.get("note") ?? ""),
            });
            if (result.error) {
              setError(result.error.message);
              return;
            }
            router.refresh();
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
            Total quote
            <input
              name="totalAmount"
              type="number"
              min="1"
              step="1"
              defaultValue={Math.max(Math.round(suggestedTotal), 1)}
              className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
            Deposit
            <input
              name="depositAmount"
              type="number"
              min="1"
              step="1"
              defaultValue={Math.max(Math.round(suggestedDeposit), 1)}
              className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </label>
        </div>

        <textarea
          name="note"
          rows={3}
          placeholder="Add approval note or inclusions..."
          className="min-h-24 resize-y rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
        />

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] px-4 text-sm font-black text-white transition hover:bg-[#1E40AF] disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Approve Quote
        </button>
      </form>

      <form
        className="grid gap-3 border-t border-[#E5E7EB] pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await declineBookingAction({
              bookingId,
              reason: String(formData.get("reason") ?? ""),
            });
            if (result.error) {
              setError(result.error.message);
              return;
            }
            router.refresh();
          });
        }}
      >
        <input
          name="reason"
          placeholder="Reason for declining"
          className="h-11 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60"
        >
          <XCircle className="h-4 w-4" />
          Decline
        </button>
      </form>

      <ErrorMessage message={error} />
    </div>
  );
}

export function OwnerCompleteBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await completeBookingAction({ bookingId });
            if (result.error) {
              setError(result.error.message);
              return;
            }
            router.refresh();
          });
        }}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] px-4 text-sm font-black text-white transition hover:bg-[#1E40AF] disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Mark Complete
      </button>
      <ErrorMessage message={error} />
    </div>
  );
}

export function BookingReviewForm({
  bookingId,
  venueId,
  userId,
}: {
  bookingId: string;
  venueId: string;
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  // Temp folder id for photo uploads that happen before the review row exists.
  const uploadFolderId = useMemo(() => crypto.randomUUID(), []);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await submitBookingReviewAction({
            bookingId,
            venueId,
            overallRating: Number(formData.get("overallRating")),
            venueQuality: Number(formData.get("venueQuality")),
            cleanliness: Number(formData.get("cleanliness")),
            staffService: Number(formData.get("staffService")),
            facilities: Number(formData.get("facilities")),
            accessibility: Number(formData.get("accessibility")),
            valueForMoney: Number(formData.get("valueForMoney")),
            foodQuality: Number(formData.get("foodQuality")),
            ambience: Number(formData.get("ambience")),
            comment: String(formData.get("comment") ?? ""),
          });
          if (result.error) {
            setError(result.error.message);
            return;
          }

          if (photos.length > 0) {
            const photoResult = await attachReviewPhotosAction({
              reviewId: result.data.reviewId,
              photos,
            });
            if (photoResult.error) {
              // Review is already saved; surface the photo failure but don't block navigation.
              setError(`Review submitted, but photos failed to attach: ${photoResult.error.message}`);
              return;
            }
          }

          router.push(`/bookings/${bookingId}`);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["overallRating", "Overall rating"],
          ["venueQuality", "Venue quality"],
          ["cleanliness", "Cleanliness"],
          ["staffService", "Staff service"],
          ["facilities", "Facilities"],
          ["accessibility", "Accessibility"],
          ["valueForMoney", "Value for money"],
          ["foodQuality", "Food quality"],
          ["ambience", "Ambience"],
        ].map(([name, label]) => (
          <label key={name} className="grid gap-2 text-sm font-bold text-slate-700">
            {label}
            <select
              name={name}
              defaultValue="5"
              className="h-12 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            >
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} star{rating > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Comment
        <textarea
          name="comment"
          rows={5}
          placeholder="Share what stood out..."
          className="min-h-32 resize-y rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm font-semibold leading-6 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
        />
      </label>

      <ReviewPhotoUploader folderId={uploadFolderId} userId={userId} onChange={setPhotos} />

      <ErrorMessage message={error} />

      <CustomerButton type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
        Submit Review
      </CustomerButton>
    </form>
  );
}
