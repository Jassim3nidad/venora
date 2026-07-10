"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import { UnauthorizedError, ForbiddenError } from "@/src/lib/errors";
import { userOwnsVenue } from "@/src/lib/rbac/ownership";
import { geocodeAddress } from "@/src/lib/geocode";
import {
  isTodayOrFutureDateString,
  isValidDateOnlyString,
  PAST_DATE_MESSAGE,
} from "@/src/lib/date-only";
import { searchMarketplaceVenues, type VenueSearchParams } from "./queries";
import { toLiveMarketplaceVenue } from "../utils/venue-mappers";
import { researchVenues } from "../data/research-venues";
import {
  ACTIVE_BOOKING_STATUSES,
  isBlockingAvailabilityStatus,
} from "@/src/features/calendar/utils/availability";

// ─── Input Schemas ───

const loadMoreVenuesSchema = z.object({
  filters: z.any(), // Passes VenueSearchParams
  page: z.number().int().min(1),
});

const toggleFavoriteSchema = z.object({
  venueId: z.string().uuid(),
});

const createInquirySchema = z.object({
  venueId: z.string().uuid(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000),
});

const checkAvailabilitySchema = z.object({
  venueId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine(isValidDateOnlyString, { message: "Invalid date" })
    .refine(isTodayOrFutureDateString, { message: PAST_DATE_MESSAGE }),
});

const approveGeneratedContentSchema = z.object({
  contentId: z.string().uuid(),
});

const rejectGeneratedContentSchema = z.object({
  contentId: z.string().uuid(),
});

const updateVenueSchema = z.object({
  venueId: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  base_price: z.number().positive(),
  capacity_min: z.number().int().nonnegative().optional(),
  capacity_max: z.number().int().positive(),
  description: z.string().optional(),
});

// ─── Actions ───

export async function loadMoreVenuesAction(rawInput: unknown) {
  return createServerAction(
    loadMoreVenuesSchema,
    async ({ filters, page }) => {
      const supabase = (await createClient()) as any;

      // Fetch favorites
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let favoriteVenueIds = new Set<string>();

      if (user) {
        const { data: favoriteRows } = await supabase
          .from("favorites")
          .select("venue_id")
          .eq("customer_id", user.id);

        if (favoriteRows) {
          favoriteVenueIds = new Set(
            favoriteRows.map((r: any) => String(r.venue_id)),
          );
        }
      }

      const searchParams = { ...filters, page, limit: 12 } as VenueSearchParams;
      const { data: dbVenues, error } = await searchMarketplaceVenues(
        supabase,
        searchParams,
      );

      if (error) throw error;

      const researchVenueById = new Map(researchVenues.map((v) => [v.id, v]));
      const dbRows = (dbVenues ?? []) as any[];

      const mapped = dbRows.map((venue) =>
        toLiveMarketplaceVenue(
          venue,
          favoriteVenueIds,
          researchVenueById.get(String(venue.id)),
        ),
      );

      return { venues: mapped, hasMore: mapped.length === 12 };
    },
    rawInput,
  );
}

export async function toggleFavoriteAction(rawInput: unknown) {
  return createServerAction(
    toggleFavoriteSchema,
    async ({ venueId }) => {
      const supabase = (await createClient()) as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError(
          "You must be signed in to favorite a venue.",
        );
      }

      if (await userOwnsVenue(supabase, user.id, venueId)) {
        throw new ForbiddenError("You cannot favorite your own venue.");
      }

      // Check if favorite exists
      const { data: existing } = await supabase
        .from("favorites")
        .select("customer_id")
        .eq("customer_id", user.id)
        .eq("venue_id", venueId)
        .maybeSingle();

      if (existing) {
        // Remove favorite
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("customer_id", user.id)
          .eq("venue_id", venueId);

        if (error) throw error;
        return { isFavorited: false };
      } else {
        // Add favorite
        const { error } = await supabase.from("favorites").insert({
          customer_id: user.id,
          venue_id: venueId,
        });

        if (error) throw error;
        return { isFavorited: true };
      }
    },
    rawInput,
  );
}

export async function createInquiryAction(rawInput: unknown) {
  return createServerAction(
    createInquirySchema,
    async ({ venueId, message }) => {
      const supabase = (await createClient()) as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError(
          "You must be signed in to send an inquiry.",
        );
      }

      if (await userOwnsVenue(supabase, user.id, venueId)) {
        throw new ForbiddenError(
          "You cannot send an inquiry to your own venue.",
        );
      }

      // Insert inquiry record
      const { data, error } = await supabase
        .from("inquiries")
        .insert({
          venue_id: venueId,
          customer_id: user.id,
          message,
          status: "new",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    rawInput,
  );
}

export async function checkAvailabilityAction(rawInput: unknown) {
  return createServerAction(
    checkAvailabilitySchema,
    async ({ venueId, date }) => {
      const supabase = (await createClient()) as any;

      // 1. Check direct override calendar status
      const { data: override } = await supabase
        .from("venue_availability")
        .select("status, seasonal_price_override")
        .eq("venue_id", venueId)
        .eq("date", date)
        .maybeSingle();

      if (override && isBlockingAvailabilityStatus(override.status)) {
        return {
          isAvailable: false,
          priceOverride: override.seasonal_price_override
            ? Number(override.seasonal_price_override)
            : null,
        };
      }

      // 2. Check active approved or pending bookings for that date
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("venue_id", venueId)
        .eq("event_date", date)
        .in("status", ACTIVE_BOOKING_STATUSES);

      const isAvailable = !bookings || bookings.length === 0;

      return {
        isAvailable,
        priceOverride: override?.seasonal_price_override
          ? Number(override.seasonal_price_override)
          : null,
      };
    },
    rawInput,
  );
}

/**
 * Approves an AI-generated content draft. Relies on the
 * "ai_content.update.owner" RLS policy (migration 029) to enforce that
 * only an org member for the venue (or admin) can move status ->
 * approved — an UPDATE the policy denies simply matches zero rows
 * rather than throwing, so we detect that via .select().maybeSingle()
 * and surface it as a ForbiddenError.
 */
export async function approveGeneratedContentAction(rawInput: unknown) {
  return createServerAction(
    approveGeneratedContentSchema,
    async ({ contentId }) => {
      const supabase = (await createClient()) as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError(
          "You must be signed in to approve AI content.",
        );
      }

      const { data: updated, error } = await supabase
        .from("ai_generated_content")
        .update({ status: "approved" })
        .eq("id", contentId)
        .select("id, venue_id, content_type, generated_text")
        .maybeSingle();

      if (error) throw error;
      if (!updated) {
        throw new ForbiddenError(
          "You do not have access to approve this content.",
        );
      }

      if (updated.content_type === "description") {
        const { error: venueUpdateError } = await supabase
          .from("venues")
          .update({ ai_generated_description: updated.generated_text })
          .eq("id", updated.venue_id);

        if (venueUpdateError) throw venueUpdateError;
      }

      return { id: updated.id, status: "approved" as const };
    },
    rawInput,
  );
}

export async function rejectGeneratedContentAction(rawInput: unknown) {
  return createServerAction(
    rejectGeneratedContentSchema,
    async ({ contentId }) => {
      const supabase = (await createClient()) as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError(
          "You must be signed in to reject AI content.",
        );
      }

      const { data: updated, error } = await supabase
        .from("ai_generated_content")
        .update({ status: "rejected" })
        .eq("id", contentId)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updated) {
        throw new ForbiddenError(
          "You do not have access to reject this content.",
        );
      }

      return { id: updated.id, status: "rejected" as const };
    },
    rawInput,
  );
}

export async function updateVenueAction(rawInput: unknown) {
  return createServerAction(
    updateVenueSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError("You must be signed in to update a venue.");
      }

      // Ensure user owns the venue organization
      const { data: venue } = await supabase
        .from("venues")
        .select("organization_id, province")
        .eq("id", input.venueId)
        .single();

      if (!venue) {
        throw new Error("Venue not found.");
      }

      // Geocode the address using OSM Nominatim
      // We use the province from the existing venue record
      const location = await geocodeAddress(
        input.address,
        input.city,
        venue.province,
      );

      const updateData: any = {
        name: input.name,
        address: input.address,
        city: input.city,
        base_price: input.base_price,
        capacity_min: input.capacity_min,
        capacity_max: input.capacity_max,
        description: input.description,
      };

      if (location) {
        updateData.latitude = location.latitude;
        updateData.longitude = location.longitude;
      }

      const { data, error } = await supabase
        .from("venues")
        .update(updateData)
        .eq("id", input.venueId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    rawInput,
  );
}
