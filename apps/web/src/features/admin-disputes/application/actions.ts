"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/src/lib/errors";
import { hasPermission } from "@/src/lib/rbac/admin-context";

const httpsUrl = z
  .string()
  .trim()
  .url("Evidence links must be valid URLs.")
  .refine(
    (value) => value.startsWith("https://"),
    "Evidence links must use https://",
  );

const updateDisputeStatusSchema = z.object({
  disputeId: z.string().uuid(),
  status: z.enum(["under_review", "resolved", "rejected", "cancelled"]),
  resolutionNotes: z.string().trim().max(2000).optional(),
});

const raiseDisputeSchema = z.object({
  bookingId: z.string().uuid(),
  category: z.enum([
    "refund_request",
    "service_not_rendered",
    "damage_claim",
    "other",
  ]),
  reason: z
    .string()
    .trim()
    .min(10, "Add at least 10 characters describing the issue.")
    .max(2000),
  evidenceUrls: z.array(httpsUrl).max(3).optional().default([]),
});

function revalidateDisputePaths(disputeId: string, bookingId?: string) {
  revalidatePath("/admin/disputes");
  revalidatePath(`/admin/disputes/${disputeId}`);
  revalidatePath("/account/disputes");
  if (bookingId) revalidatePath(`/bookings/${bookingId}`);
}

export async function updateDisputeStatusAction(rawInput: unknown) {
  return createServerAction(
    updateDisputeStatusSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError("Sign in to update a dispute.");
      }

      if (input.status === "under_review") {
        if (!(await hasPermission("disputes.manage"))) {
          throw new ForbiddenError(
            "You do not have permission to manage disputes.",
          );
        }
      }

      if (input.status === "cancelled") {
        const canManage = await hasPermission("disputes.manage");
        if (!canManage) {
          const { data: dispute } = await supabase
            .from("disputes")
            .select("raised_by, status")
            .eq("id", input.disputeId)
            .maybeSingle();

          if (!dispute || dispute.raised_by !== user.id) {
            throw new ForbiddenError(
              "Only the case raiser or a dispute manager can cancel.",
            );
          }
          if (dispute.status !== "open") {
            throw new ValidationError(
              "Only open disputes can be cancelled by the raiser.",
            );
          }
        }
      }

      if (input.status === "resolved" || input.status === "rejected") {
        if (!(await hasPermission("disputes.resolve"))) {
          throw new ForbiddenError(
            "You do not have permission to resolve disputes.",
          );
        }
        if (!input.resolutionNotes || input.resolutionNotes.length < 5) {
          throw new ValidationError(
            "Add resolution notes (at least 5 characters).",
          );
        }
      }

      const { error } = await supabase.rpc("update_dispute_status", {
        p_dispute_id: input.disputeId,
        p_new_status: input.status,
        p_resolution_notes: input.resolutionNotes ?? null,
      });

      if (error) {
        throw new ValidationError(
          error.message || "Unable to update dispute status.",
        );
      }

      revalidateDisputePaths(input.disputeId);
      return { disputeId: input.disputeId, status: input.status };
    },
    rawInput,
  );
}

export async function raiseDisputeAction(rawInput: unknown) {
  return createServerAction(
    raiseDisputeSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError("Sign in to raise a dispute.");
      }

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select(
          "id, customer_id, status, venue_id, venues(id, organization_id)",
        )
        .eq("id", input.bookingId)
        .maybeSingle();

      if (bookingError || !booking) {
        throw new ValidationError("Booking not found.");
      }

      if (booking.customer_id !== user.id) {
        throw new ForbiddenError(
          "You can only raise disputes for your own bookings.",
        );
      }

      const eligible = ["confirmed", "completed", "cancelled", "reviewed"];
      if (!eligible.includes(booking.status)) {
        throw new ValidationError(
          "Disputes can only be raised for confirmed, completed, or cancelled bookings.",
        );
      }

      const venue = Array.isArray(booking.venues)
        ? booking.venues[0]
        : booking.venues;
      if (!venue?.organization_id || !booking.venue_id) {
        throw new ValidationError("Booking venue is incomplete.");
      }

      const evidenceUrls = Array.from(
        new Set((input.evidenceUrls ?? []).map((url) => url.trim()).filter(Boolean)),
      );

      const { data: paidTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("booking_id", input.bookingId)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: dispute, error } = await supabase
        .from("disputes")
        .insert({
          booking_id: input.bookingId,
          transaction_id: paidTx?.id ?? null,
          raised_by: user.id,
          venue_id: booking.venue_id,
          organization_id: venue.organization_id,
          category: input.category,
          reason: input.reason,
          evidence_urls: evidenceUrls,
          status: "open",
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new ValidationError(
            "An open dispute already exists for this booking and category.",
          );
        }
        throw new ValidationError(
          error.message || "Unable to create the dispute.",
        );
      }

      revalidateDisputePaths(dispute.id as string, input.bookingId);
      return { disputeId: dispute.id as string };
    },
    rawInput,
  );
}
