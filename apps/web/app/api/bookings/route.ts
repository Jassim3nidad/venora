import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createBookingSchema } from "@/src/features/booking/schemas/booking.schema";
import { VenoraError } from "@/src/lib/errors";

function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
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
    const message = String(error.message);
    const normalized = message.toLowerCase();

    if (
      normalized.includes("already has an active booking") ||
      normalized.includes("unavailable on the selected date") ||
      normalized.includes("not available for booking")
    ) {
      return apiError("BOOKING_CONFLICT", message, 409);
    }

    return apiError("BOOKING_ACTION_FAILED", message, 400);
  }

  return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
}

function isMissingRpcError(
  error: { message?: string; code?: string } | null | undefined,
) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("schema cache")
  );
}

async function getVenueSlug(supabase: any, venueId: string) {
  const { data } = await supabase
    .from("venues")
    .select("slug")
    .eq("id", venueId)
    .maybeSingle();

  return (data?.slug as string | null | undefined) ?? null;
}

function revalidateBookingCreateViews(venueSlug?: string | null) {
  revalidatePath("/bookings");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/venue-owner");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/venues");

  if (venueSlug) {
    revalidatePath(`/venues/${venueSlug}`);
    revalidatePath(`/venues/${venueSlug}/book`);
  }
}

export async function GET() {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        status,
        event_date,
        guest_count,
        total_amount,
        deposit_amount,
        payment_due_at,
        venues(id, name, slug, city, province)
      `,
      )
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

    if (!user)
      return apiError("UNAUTHORIZED", "Please sign in to continue.", 401);

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
      return apiError(
        "BOOKING_WORKFLOW_UNAVAILABLE",
        "Booking workflow is not available. Please try again later.",
        503,
      );
    }

    if (error) throw error;

    revalidateBookingCreateViews(await getVenueSlug(supabase, input.venueId));

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
