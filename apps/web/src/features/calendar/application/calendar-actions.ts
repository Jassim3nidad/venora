"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { 
  UpdateAvailabilityInput, 
  updateAvailabilitySchema, 
  MoveBookingInput, 
  moveBookingSchema 
} from "../schemas/calendar.schema";

export async function updateAvailability(input: UpdateAvailabilityInput) {
  try {
    const data = updateAvailabilitySchema.parse(input);
    const supabase = await createClient();
    
    // We update or insert into venue_availability
    const { error } = await (supabase as any)
      .from("venue_availability")
      .upsert({
        venue_id: data.venueId,
        date: data.date,
        status: data.status,
        seasonal_price_override: data.seasonalPriceOverride,
        note: data.note,
      }, { onConflict: "venue_id, date" });

    if (error) {
      console.error("updateAvailability error:", error);
      return { success: false, error: "Failed to update availability" };
    }

    revalidatePath("/dashboard/calendar");
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
    
    // In a real app, moving a booking might require changing price, etc.
    // Here we just update the event_date.
    const { error } = await (supabase as any)
      .from("bookings")
      .update({ event_date: data.newDate })
      .eq("id", data.bookingId);

    if (error) {
      console.error("moveBookingDate error:", error);
      return { success: false, error: "Failed to move booking" };
    }

    revalidatePath("/dashboard/calendar");
    return { success: true };
  } catch (error) {
    console.error("moveBookingDate validation error:", error);
    return { success: false, error: "Validation failed" };
  }
}
