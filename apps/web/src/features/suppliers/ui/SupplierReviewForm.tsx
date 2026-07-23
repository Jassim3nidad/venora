"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { CustomerButton } from "@/src/components/customer/CustomerUI";
import { submitSupplierReviewAction } from "../application/actions";

export function SupplierReviewForm({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await submitSupplierReviewAction({
            inquiryId,
            overallRating: Number(formData.get("overallRating")),
            comment: String(formData.get("comment") ?? ""),
          });

          if (result.error) {
            setError(result.error.message);
            return;
          }

          router.push(`/inquiries/${inquiryId}`);
          router.refresh();
        });
      }}
    >
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Overall rating
        <select
          name="overallRating"
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

      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Comment
        <textarea
          name="comment"
          rows={6}
          placeholder="Share how the supplier handled your event..."
          className="min-h-36 resize-y rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm font-semibold leading-6 outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <CustomerButton type="submit" disabled={isPending}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Star className="h-4 w-4" />
        )}
        Submit Review
      </CustomerButton>
    </form>
  );
}
