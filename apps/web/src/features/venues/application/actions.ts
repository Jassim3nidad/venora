"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import { UnauthorizedError } from "@/src/lib/errors";
import { geocodeAddress } from "@/src/lib/geocode";
import {
  isTodayOrFutureDateString,
  isValidDateOnlyString,
  PAST_DATE_MESSAGE,
} from "@/src/lib/date-only";

// ─── Input Schemas ───

const toggleFavoriteSchema = z.object({
  venueId: z.string().uuid(),
});

const createInquirySchema = z.object({
  venueId: z.string().uuid(),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000),
});

const checkAvailabilitySchema = z.object({
  venueId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine(isValidDateOnlyString, { message: "Invalid date" })
    .refine(isTodayOrFutureDateString, { message: PAST_DATE_MESSAGE }),
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

export async function toggleFavoriteAction(rawInput: unknown) {
  return createServerAction(toggleFavoriteSchema, async ({ venueId }) => {
    const supabase = await createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError("You must be signed in to favorite a venue.");
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
      const { error } = await supabase
        .from("favorites")
        .insert({
          customer_id: user.id,
          venue_id: venueId,
        });

      if (error) throw error;
      return { isFavorited: true };
    }
  }, rawInput);
}

export async function createInquiryAction(rawInput: unknown) {
  return createServerAction(createInquirySchema, async ({ venueId, message }) => {
    const supabase = await createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError("You must be signed in to send an inquiry.");
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
  }, rawInput);
}

export async function checkAvailabilityAction(rawInput: unknown) {
  return createServerAction(checkAvailabilitySchema, async ({ venueId, date }) => {
    const supabase = await createClient() as any;

    // 1. Check direct override calendar status
    const { data: override } = await supabase
      .from("venue_availability")
      .select("status, seasonal_price_override")
      .eq("venue_id", venueId)
      .eq("date", date)
      .maybeSingle();

    if (override && ["reserved", "maintenance", "blackout"].includes(override.status)) {
      return { isAvailable: false, priceOverride: override.seasonal_price_override ? Number(override.seasonal_price_override) : null };
    }

    // 2. Check active approved or pending bookings for that date
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("venue_id", venueId)
      .eq("event_date", date)
      .in("status", [
        "pending",
        "approved",
        "completed",
      ]);

    const isAvailable = !bookings || bookings.length === 0;

    return {
      isAvailable,
      priceOverride: override?.seasonal_price_override ? Number(override.seasonal_price_override) : null,
    };
  }, rawInput);
}

export async function updateVenueAction(rawInput: unknown) {
  return createServerAction(updateVenueSchema, async (input) => {
    const supabase = await createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

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
    const location = await geocodeAddress(input.address, input.city, venue.province);

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
  }, rawInput);
}
