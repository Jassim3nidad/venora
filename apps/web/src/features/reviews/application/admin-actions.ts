"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/lib/server-action";
import { requireRole } from "@/lib/rbac/guards";
import { ROLES } from "@/lib/rbac/roles";
import {
  ForbiddenError,
  ReviewNotFoundError,
  ValidationError,
} from "@/lib/errors";
import { moderateReviewSchema } from "../schemas/review-moderation.schema";

function throwIfSupabaseError(
  error: { message?: string } | null | undefined,
): void {
  if (!error) return;
  const normalized = (error.message ?? "").toLowerCase();
  if (
    normalized.includes("permission") ||
    normalized.includes("row-level security")
  ) {
    throw new ForbiddenError(error.message);
  }
  throw new ValidationError(error.message ?? "Moderation action failed");
}

async function updateReviewStatus(
  reviewId: string,
  status: "published" | "removed",
) {
  await requireRole(ROLES.ADMIN);
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("reviews")
    .update({ status })
    .eq("id", reviewId)
    .select("id, status, venues(slug)")
    .maybeSingle();

  throwIfSupabaseError(error);
  if (!data) throw new ReviewNotFoundError();

  revalidatePath("/admin/reviews");
  const venue = Array.isArray(data.venues) ? data.venues[0] : data.venues;
  if (venue?.slug) revalidatePath(`/venues/${venue.slug}`);

  await supabase.rpc("admin_log_action", {
    p_action: status === "published" ? "review.restored" : "review.removed",
    p_entity_type: "reviews",
    p_entity_id: reviewId,
    p_reason: `Review status changed to ${status}`,
    p_metadata: { new_status: status },
  });

  return { reviewId, status: data.status as string };
}

export async function restoreReviewAction(rawInput: unknown) {
  return createServerAction(
    moderateReviewSchema,
    async (input) => {
      return updateReviewStatus(input.reviewId, "published");
    },
    rawInput,
  );
}

export async function removeReviewAction(rawInput: unknown) {
  return createServerAction(
    moderateReviewSchema,
    async (input) => {
      return updateReviewStatus(input.reviewId, "removed");
    },
    rawInput,
  );
}
