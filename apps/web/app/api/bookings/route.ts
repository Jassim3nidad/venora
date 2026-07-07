import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createBookingSchema } from "@/src/features/booking/schemas/booking.schema";
import { VenoraError } from "@/src/lib/errors";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { data: null, error: { code, message, details } },
    { status },
  );
}

function mapUnknownError(error: unknown) {
  if (error instanceof VenoraError) {
    return apiError(error.code, error.message, error.httpStatus);
  }

  if (error && typeof error === "object" && "message" in error) {
    return apiError("BOOKING_ACTION_FAILED", String(error.message), 400);
  }

  return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
}

function isMissingRpcError(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("schema cache")
  );
}

export async function GET() {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        status,
        event_date,
        guest_count,
        total_amount,
        deposit_amount,
        payment_due_at,
        venues(id, name, slug, city, province)
      `)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data ?? [], error: null });
  } catch (error) {
    return mapUnknownError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid input. Please check the highlighted fields.",
        400,
        parsed.error.flatten(),
      );
    }

    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);

    const input = parsed.data;
    const { data, error } = await supabase.rpc("create_booking_inquiry", {
      p_venue_id: input.venueId,
      p_package_id: input.packageId || null,
      p_event_date: input.eventDate,
      p_guest_count: input.guestCount,
      p_special_requests: input.specialRequests?.trim() || null,
      p_event_start_time: input.eventStartTime || null,
      p_event_end_time: input.eventEndTime || null,
    });

    if (isMissingRpcError(error)) {
      const { data: venue, error: venueError } = await supabase
        .from("venues")
        .select("id, status, capacity_min, capacity_max")
        .eq("id", input.venueId)
        .eq("status", "published")
        .single();

      if (venueError) throw venueError;

      const capacityMin = venue.capacity_min ?? 1;
      const capacityMax = venue.capacity_max ?? capacityMin;

      if (input.guestCount < capacityMin || input.guestCount > capacityMax) {
        return apiError(
          "VALIDATION_ERROR",
          "Guest count is outside this venue capacity.",
          400,
        );
      }

      if (input.packageId) {
        const { data: selectedPackage, error: packageError } = await supabase
          .from("venue_packages")
          .select("id, min_guests, max_guests")
          .eq("id", input.packageId)
          .eq("venue_id", input.venueId)
          .eq("is_active", true)
          .single();

        if (packageError) throw packageError;

        if (
          (selectedPackage.min_guests !== null && input.guestCount < selectedPackage.min_guests) ||
          (selectedPackage.max_guests !== null && input.guestCount > selectedPackage.max_guests)
        ) {
          return apiError(
            "VALIDATION_ERROR",
            "Guest count is outside the selected package limits.",
            400,
          );
        }
      }

      const { data: availability, error: availabilityError } = await supabase
        .from("venue_availability")
        .select("status")
        .eq("venue_id", input.venueId)
        .eq("date", input.eventDate)
        .maybeSingle();

      if (availabilityError) throw availabilityError;

      if (availability && ["reserved", "maintenance", "blackout"].includes(availability.status)) {
        return apiError("BOOKING_CONFLICT", "This venue is unavailable on the selected date.", 409);
      }

      const { data: conflicts, error: conflictsError } = await supabase
        .from("bookings")
        .select("id")
        .eq("venue_id", input.venueId)
        .eq("event_date", input.eventDate)
        .in("status", ["pending", "approved", "completed"])
        .limit(1);

      if (conflictsError) throw conflictsError;

      if ((conflicts ?? []).length > 0) {
        return apiError(
          "BOOKING_CONFLICT",
          "This venue already has an active booking for the selected date.",
          409,
        );
      }

      const fallbackInsert = {
        venue_id: input.venueId,
        customer_id: user.id,
        package_id: input.packageId || null,
        event_date: input.eventDate,
        guest_count: input.guestCount,
        status: "pending",
        special_requests: input.specialRequests?.trim() || null,
      };

      const { data: insertedBooking, error: insertError } = await supabase
        .from("bookings")
        .insert(fallbackInsert)
        .select("id, status, event_date")
        .single();

      if (insertError) throw insertError;

      revalidatePath("/bookings");

      return NextResponse.json(
        {
          data: {
            bookingId: insertedBooking.id,
            status: insertedBooking.status,
            eventDate: insertedBooking.event_date,
          },
          error: null,
        },
        { status: 201 },
      );
    }

    if (error) throw error;

    revalidatePath("/bookings");

    return NextResponse.json(
      {
        data: {
          bookingId: data.id,
          status: data.status,
          eventDate: data.event_date,
        },
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    return mapUnknownError(error);
  }
}
