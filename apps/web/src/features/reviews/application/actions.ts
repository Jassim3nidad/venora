"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/lib/server-action";
import { requireAuth, requireRole } from "@/lib/rbac/guards";
import { ROLES } from "@/lib/rbac/roles";
import {
  AlreadyFlaggedError,
  ForbiddenError,
  PhotoLimitExceededError,
  ReviewNotFoundError,
  ReviewReplyNotAllowedError,
  ValidationError,
} from "@/lib/errors";
import { attachReviewPhotosSchema, deleteReviewPhotoSchema } from "../schemas/review-photo.schema";
import { replyToReviewSchema } from "../schemas/review-reply.schema";
import { flagReviewSchema } from "../schemas/review-flag.schema";
import { toggleHelpfulVoteSchema } from "../schemas/review-vote.schema";

const MAX_PHOTOS_PER_REVIEW = 5;

function reviewErrorFromMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate key") && normalized.includes("review_flags")) {
    return new AlreadyFlaggedError();
  }
  if (normalized.includes("foreign key") || normalized.includes("not found")) {
    return new ReviewNotFoundError();
  }
  if (
    normalized.includes("permission") ||
    normalized.includes("row-level security") ||
    normalized.includes("policy")
  ) {
    return new ForbiddenError(message);
  }

  return new ValidationError(message);
}

function throwIfSupabaseError(error: { message?: string } | null | undefined): void {
  if (error) {
    throw reviewErrorFromMessage(error.message ?? "Review action failed");
  }
}

async function getVenueSlugForReview(supabase: any, reviewId: string): Promise<string | null> {
  const { data } = await supabase
    .from("reviews")
    .select("venues(slug)")
    .eq("id", reviewId)
    .maybeSingle();

  const venue = Array.isArray(data?.venues) ? data?.venues[0] : data?.venues;
  return venue?.slug ?? null;
}

function revalidateVenuePage(slug: string | null) {
  if (slug) revalidatePath(`/venues/${slug}`);
}

/**
 * App-level ownership check mirroring the RLS `is_org_member_for_venue`
 * policy — used instead of getOwnerDashboardContext() (which redirects on
 * missing auth, appropriate for pages, not Server Actions).
 */
async function userOwnsVenue(supabase: any, userId: string, venueId: string): Promise<boolean> {
  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (roleRows ?? []).map((row: { role: string }) => row.role);
  if (roles.includes(ROLES.ADMIN)) return true;

  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);
  const orgIds = (members ?? []).map((member: { organization_id: string }) => member.organization_id);
  if (orgIds.length === 0) return false;

  const { data: venue } = await supabase
    .from("venues")
    .select("id")
    .eq("id", venueId)
    .in("organization_id", orgIds)
    .maybeSingle();

  return !!venue;
}

export async function attachReviewPhotosAction(rawInput: unknown) {
  return createServerAction(attachReviewPhotosSchema, async (input) => {
    const { userId } = await requireAuth();
    const supabase = (await createClient()) as any;

    const { data: review } = await supabase
      .from("reviews")
      .select("id, customer_id, venue_id")
      .eq("id", input.reviewId)
      .maybeSingle();

    if (!review) throw new ReviewNotFoundError();
    if (review.customer_id !== userId) throw new ForbiddenError("You can only attach photos to your own review.");

    const { count: existingCount } = await supabase
      .from("review_photos")
      .select("id", { count: "exact", head: true })
      .eq("review_id", input.reviewId);

    if ((existingCount ?? 0) + input.photos.length > MAX_PHOTOS_PER_REVIEW) {
      throw new PhotoLimitExceededError(MAX_PHOTOS_PER_REVIEW);
    }

    const { data, error } = await supabase
      .from("review_photos")
      .insert(
        input.photos.map((photo) => ({
          review_id: input.reviewId,
          storage_path: photo.storagePath,
          url: photo.url,
        })),
      )
      .select("id");

    throwIfSupabaseError(error);

    const slug = await getVenueSlugForReview(supabase, input.reviewId);
    revalidateVenuePage(slug);

    return {
      reviewId: input.reviewId,
      photoIds: (data ?? []).map((row: { id: string }) => row.id),
    };
  }, rawInput);
}

export async function deleteReviewPhotoAction(rawInput: unknown) {
  return createServerAction(deleteReviewPhotoSchema, async (input) => {
    const { userId } = await requireAuth();
    const supabase = (await createClient()) as any;

    const { data: photo } = await supabase
      .from("review_photos")
      .select("id, storage_path, review_id, reviews(customer_id, venue_id)")
      .eq("id", input.photoId)
      .maybeSingle();

    if (!photo) throw new ReviewNotFoundError();

    const review = Array.isArray(photo.reviews) ? photo.reviews[0] : photo.reviews;
    if (!review || review.customer_id !== userId) {
      throw new ForbiddenError("You can only delete photos from your own review.");
    }

    await supabase.storage.from("review-photos").remove([photo.storage_path]);

    const { error } = await supabase.from("review_photos").delete().eq("id", input.photoId);
    throwIfSupabaseError(error);

    const slug = await getVenueSlugForReview(supabase, photo.review_id);
    revalidateVenuePage(slug);

    return { photoId: input.photoId };
  }, rawInput);
}

export async function replyToReviewAction(rawInput: unknown) {
  return createServerAction(replyToReviewSchema, async (input) => {
    const { userId } = await requireRole(ROLES.VENUE_OWNER, ROLES.EVENT_COORDINATOR, ROLES.ADMIN);
    const supabase = (await createClient()) as any;

    const { data: review } = await supabase
      .from("reviews")
      .select("id, venue_id")
      .eq("id", input.reviewId)
      .maybeSingle();

    if (!review) throw new ReviewNotFoundError();

    const allowed = await userOwnsVenue(supabase, userId, review.venue_id);
    if (!allowed) throw new ReviewReplyNotAllowedError();

    const ownerReplyAt = new Date().toISOString();

    // Only ever send owner_reply/owner_reply_at — RLS reviews.update.owner_reply
    // has no column-level restriction, so this app-level scoping is what
    // actually prevents an owner from touching rating/comment fields.
    const { data, error } = await supabase
      .from("reviews")
      .update({ owner_reply: input.reply, owner_reply_at: ownerReplyAt })
      .eq("id", input.reviewId)
      .select("id, owner_reply, owner_reply_at")
      .single();

    throwIfSupabaseError(error);

    revalidatePath("/dashboard/reviews");
    const slug = await getVenueSlugForReview(supabase, input.reviewId);
    revalidateVenuePage(slug);

    return {
      reviewId: input.reviewId,
      ownerReply: data.owner_reply as string,
      ownerReplyAt: data.owner_reply_at as string,
    };
  }, rawInput);
}

export async function flagReviewAction(rawInput: unknown) {
  return createServerAction(flagReviewSchema, async (input) => {
    const { userId } = await requireAuth();
    const supabase = (await createClient()) as any;

    const { error } = await supabase.from("review_flags").insert({
      review_id: input.reviewId,
      reporter_id: userId,
      reason: input.reason,
      details: input.details ?? null,
    });

    throwIfSupabaseError(error);

    // Reporting never changes review.status — it stays publicly visible
    // until an admin acts from the moderation queue.
    revalidatePath("/admin/reviews");

    return { flagged: true as const };
  }, rawInput);
}

export async function toggleHelpfulVoteAction(rawInput: unknown) {
  return createServerAction(toggleHelpfulVoteSchema, async (input) => {
    const { userId } = await requireAuth();
    const supabase = (await createClient()) as any;

    const { data: review } = await supabase
      .from("reviews")
      .select("id, customer_id, venue_id")
      .eq("id", input.reviewId)
      .maybeSingle();

    if (!review) throw new ReviewNotFoundError();
    if (review.customer_id === userId) {
      throw new ForbiddenError("You can't vote on your own review.");
    }

    const { data: existingVote } = await supabase
      .from("review_helpful_votes")
      .select("review_id")
      .eq("review_id", input.reviewId)
      .eq("voter_id", userId)
      .maybeSingle();

    let voted: boolean;
    if (existingVote) {
      const { error } = await supabase
        .from("review_helpful_votes")
        .delete()
        .eq("review_id", input.reviewId)
        .eq("voter_id", userId);
      throwIfSupabaseError(error);
      voted = false;
    } else {
      const { error } = await supabase
        .from("review_helpful_votes")
        .insert({ review_id: input.reviewId, voter_id: userId });
      throwIfSupabaseError(error);
      voted = true;
    }

    const { data: updated } = await supabase
      .from("reviews")
      .select("helpful_count")
      .eq("id", input.reviewId)
      .single();

    const slug = await getVenueSlugForReview(supabase, input.reviewId);
    revalidateVenuePage(slug);

    return {
      reviewId: input.reviewId,
      voted,
      helpfulCount: Number(updated?.helpful_count) || 0,
    };
  }, rawInput);
}
