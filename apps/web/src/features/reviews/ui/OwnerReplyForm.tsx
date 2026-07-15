"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MessageSquareReply } from "lucide-react";
import { toast } from "sonner";
import {
  replyToReviewSchema,
  type ReplyToReviewInput,
} from "../schemas/review-reply.schema";
import { replyToReviewAction } from "../application/actions";

export function OwnerReplyForm({
  reviewId,
  existingReply,
}: {
  reviewId: string;
  existingReply?: string | null;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReplyToReviewInput>({
    resolver: zodResolver(replyToReviewSchema),
    defaultValues: { reviewId, reply: existingReply ?? "" },
  });

  const replyValue = watch("reply") ?? "";

  async function onSubmit(data: ReplyToReviewInput) {
    const result = await replyToReviewAction(data);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Reply published");
    reset({ reviewId, reply: result.data.ownerReply });
  }

  return (
    <form className="grid gap-2" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("reviewId")} />
      <textarea
        rows={3}
        maxLength={1000}
        placeholder="Write a public reply to this guest..."
        {...register("reply")}
        className="w-full resize-none rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] p-3 text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-500)]"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--text-muted)]">
          {replyValue.length}/1000
        </span>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MessageSquareReply className="h-3.5 w-3.5" />
          )}
          {existingReply ? "Update reply" : "Reply"}
        </button>
      </div>
      {errors.reply ? (
        <span className="text-xs text-red-600">{errors.reply.message}</span>
      ) : null}
    </form>
  );
}
