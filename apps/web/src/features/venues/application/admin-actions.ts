"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/lib/server-action";
import { requirePermission } from "@/lib/rbac/admin-context";
import type { AdminPermission } from "@/lib/rbac/permissions";
import {
  createReviewActionSchema,
  throwIfReviewActionError,
} from "@/lib/admin/review-action";
import {
  VENUE_REVIEW_ACTIONS,
  type VenueReviewAction,
} from "../types/venue-review-action.types";

const VENUE_ACTION_PERMISSIONS: Record<VenueReviewAction, AdminPermission> = {
  begin_review: "venues.review",
  request_info: "venues.review",
  note: "venues.review",
  approve: "venues.approve",
  reject: "venues.reject",
  suspend: "venues.suspend",
  restore: "venues.suspend",
  unpublish: "venues.suspend",
};

const reviewVenueSchema = createReviewActionSchema(VENUE_REVIEW_ACTIONS);

export async function reviewVenueAction(rawInput: unknown) {
  return createServerAction(
    reviewVenueSchema,
    async (input) => {
      // Defense-in-depth: admin_review_venue() re-checks the same permission
      // and is the real authority — it also enforces the status-transition
      // and required-field validation that can't live at this layer.
      await requirePermission(VENUE_ACTION_PERMISSIONS[input.action]);

      const supabase = (await createClient()) as any;
      const { data, error } = await supabase.rpc("admin_review_venue", {
        p_venue_id: input.id,
        p_action: input.action,
        p_reason: input.reason ?? null,
      });

      throwIfReviewActionError(error);

      revalidatePath("/admin/venues");
      revalidatePath(`/admin/venues/${input.id}`);

      return { id: input.id, status: data?.status as string };
    },
    rawInput,
  );
}
