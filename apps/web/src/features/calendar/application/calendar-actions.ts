"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  UpdateAvailabilityInput,
  updateAvailabilitySchema,
  MoveBookingInput,
  moveBookingSchema,
} from "../schemas/calendar.schema";
import { ACTIVE_BOOKING_STATUSES } from "../utils/availability";

function revalidateAvailabilityViews(slug?: string | null) {
  revalidatePath("/dashboard/calendar");
  revalidatePath("/venues");

  if (slug) {
    revalidatePath(`/venues/${slug}`);
    revalidatePath(`/venues/${slug}/book`);
  }
}

export async function updateAvailability(input: UpdateAvailabilityInput) {
  try {
    const data = updateAvailabilitySchema.parse(input);
    const supabase = await createClient();

    const { data: venue, error: venueError } = await (supabase as any)
      .from("venues")
      .select("id, slug")
      .eq("id", data.venueId)
      .maybeSingle();

    if (venueError) {
      console.error("updateAvailability venue error:", venueError);
      return { success: false, error: "Failed to load venue access" };
    }

    if (!venue) {
      return { success: false, error: "Venue not found or access denied" };
    }

    const { data: activeBookings, error: bookingsError } = await (
      supabase as any
    )
      .from("bookings")
      .select("id")
      .eq("venue_id", data.venueId)
      .eq("event_date", data.date)
      .in("status", ACTIVE_BOOKING_STATUSES)
      .limit(1);

    if (bookingsError) {
      console.error("updateAvailability bookings error:", bookingsError);
      return { success: false, error: "Failed to verify date bookings" };
    }

    if ((activeBookings ?? []).length > 0) {
      return {
        success: false,
        error:
          "This date has active booking activity. Manage the booking before changing availability.",
      };
    }

    const { error } = await (supabase as any).from("venue_availability").upsert(
      {
        venue_id: data.venueId,
        date: data.date,
        status: data.status,
        seasonal_price_override:
          data.status === "available"
            ? null
            : (data.seasonalPriceOverride ?? null),
        note:
          data.status === "available"
            ? null
            : data.note?.trim()
              ? data.note.trim()
              : null,
      },
      { onConflict: "venue_id, date" },
    );

    if (error) {
      console.error("updateAvailability error:", error);
      return { success: false, error: "Failed to update availability" };
    }

    revalidateAvailabilityViews(venue.slug);
    return { success: true };
  } catch (error) {
    console.error("updateAvailability validation error:", error);
    return { success: false, error: "Validation failed" };
  }
}

export async function moveBookingDate(input: MoveBookingInput) {
  try {
    const data = moveBookingSchema.parse(input);
    const supabase = await createClient();

    const { data: booking, error: bookingError } = await (supabase as any)
      .from("bookings")
      .select("id, venue_id, status, venues(slug)")
      .eq("id", data.bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error("moveBookingDate booking error:", bookingError);
      return { success: false, error: "Failed to load booking" };
    }

    if (!booking) {
      return { success: false, error: "Booking not found or access denied" };
    }

    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
      return {
        success: false,
        error: "Only active bookings can be moved on the calendar.",
      };
    }

    const { data: availability, error: availabilityError } = await (
      supabase as any
    )
      .from("venue_availability")
      .select("status")
      .eq("venue_id", booking.venue_id)
      .eq("date", data.newDate)
      .maybeSingle();

    if (availabilityError) {
      console.error("moveBookingDate availability error:", availabilityError);
      return { success: false, error: "Failed to check target date" };
    }

    if (
      availability &&
      ["tentative", "reserved", "maintenance", "blackout"].includes(
        availability.status,
      )
    ) {
      return {
        success: false,
        error: "That date is not available. Choose another date first.",
      };
    }

    const { data: conflicts, error: conflictsError } = await (supabase as any)
      .from("bookings")
      .select("id")
      .eq("venue_id", booking.venue_id)
      .eq("event_date", data.newDate)
      .neq("id", data.bookingId)
      .in("status", ACTIVE_BOOKING_STATUSES)
      .limit(1);

    if (conflictsError) {
      console.error("moveBookingDate conflicts error:", conflictsError);
      return { success: false, error: "Failed to check target date" };
    }

    if ((conflicts ?? []).length > 0) {
      return {
        success: false,
        error: "That date already has an active booking.",
      };
    }

    const { error } = await (supabase as any)
      .from("bookings")
      .update({ event_date: data.newDate })
      .eq("id", data.bookingId);

    if (error) {
      console.error("moveBookingDate error:", error);
      return { success: false, error: "Failed to move booking" };
    }

    const venue = Array.isArray(booking.venues)
      ? booking.venues[0]
      : booking.venues;
    revalidateAvailabilityViews(venue?.slug ?? null);
    revalidatePath("/dashboard/bookings");
    revalidatePath(`/dashboard/bookings/${data.bookingId}`);
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${data.bookingId}`);
    return { success: true };
  } catch (error) {
    console.error("moveBookingDate validation error:", error);
    return { success: false, error: "Validation failed" };
  }
}
