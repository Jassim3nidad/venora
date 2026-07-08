"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flag, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { flagReviewSchema, REVIEW_FLAG_REASONS, type FlagReviewInput } from "../schemas/review-flag.schema";
import { flagReviewAction } from "../application/actions";

const REASON_LABELS: Record<(typeof REVIEW_FLAG_REASONS)[number], string> = {
  spam: "Spam or advertising",
  offensive: "Offensive or abusive",
  fake: "Fake or misleading",
  other: "Other",
};

export function ReportReviewDialog({ reviewId }: { reviewId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FlagReviewInput>({
    resolver: zodResolver(flagReviewSchema),
    defaultValues: { reviewId, reason: "spam", details: "" },
  });

  async function onSubmit(data: FlagReviewInput) {
    const result = await flagReviewAction(data);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    setSubmitted(true);
  }

  function close() {
    setIsOpen(false);
    setSubmitted(false);
    reset({ reviewId, reason: "spam", details: "" });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
      >
        <Flag className="h-3.5 w-3.5" />
        Report
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-[var(--border-default)] bg-[var(--bg-base)] p-6 shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-sora text-base font-bold text-[var(--text-primary)]">Report this review</h3>
              <button
                type="button"
                onClick={close}
                className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitted ? (
              <div className="mt-4 rounded-2xl bg-[var(--bg-subtle)] p-4 text-sm font-semibold text-[var(--text-secondary)]">
                Thanks, we&apos;ll review this.
              </div>
            ) : (
              <form className="mt-4 grid gap-3" onSubmit={handleSubmit(onSubmit)}>
                <input type="hidden" {...register("reviewId")} />

                <label className="grid gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                  Reason
                  <select
                    {...register("reason")}
                    className="h-11 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] px-3 text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-500)]"
                  >
                    {REVIEW_FLAG_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {REASON_LABELS[reason]}
                      </option>
                    ))}
                  </select>
                  {errors.reason ? <span className="text-red-600">{errors.reason.message}</span> : null}
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                  Additional details (optional)
                  <textarea
                    rows={3}
                    {...register("details")}
                    className="resize-none rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-3 text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-500)]"
                  />
                  {errors.details ? <span className="text-red-600">{errors.details.message}</span> : null}
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-500)] text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit report
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
