"use server";

import { z } from "zod";
import { createClient } from "@/src/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import { UnauthorizedError } from "@/src/lib/errors";

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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
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
      .in("status", ["approved", "pending"]);

    const isAvailable = !bookings || bookings.length === 0;

    return {
      isAvailable,
      priceOverride: override?.seasonal_price_override ? Number(override.seasonal_price_override) : null,
    };
  }, rawInput);
}
