import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/src/lib/supabase/server";

const statusActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    totalAmount: z.coerce.number().positive(),
    depositAmount: z.coerce.number().positive(),
    note: z.string().max(1000).optional(),
  }),
  z.object({
    action: z.literal("decline"),
    reason: z.string().min(5).max(500),
  }),
  z.object({
    action: z.literal("cancel"),
    reason: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("complete"),
  }),
]);

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

async function canManageBooking(supabase: any, bookingId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, venues(organization_id)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return false;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if ((roles ?? []).some((row: { role: string }) => row.role === "admin")) {
    return booking;
  }

  const organizationId = booking.venues?.organization_id;
  if (!organizationId) return false;

  const [{ data: membership }, { data: organization }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);

  return membership || organization ? booking : false;
}

async function getBookingVenueSlug(supabase: any, bookingId: string) {
  const { data } = await supabase
    .from("bookings")
    .select("venues(slug)")
    .eq("id", bookingId)
    .maybeSingle();

  const venue = Array.isArray(data?.venues) ? data.venues[0] : data?.venues;
  return (venue?.slug as string | null | undefined) ?? null;
}

function revalidateBookingViews(bookingId: string, venueSlug?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/venue-owner");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/venues");

  if (venueSlug) {
    revalidatePath(`/venues/${venueSlug}`);
    revalidatePath(`/venues/${venueSlug}/book`);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const [{ id }, body] = await Promise.all([context.params, request.json()]);
    const parsed = statusActionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid input. Please check the request body.",
        400,
        parsed.error.flatten(),
      );
    }

    const supabase = (await createClient()) as any;
    const input = parsed.data;
    let result;

    if (input.action === "approve") {
      const booking = await canManageBooking(supabase, id);
      if (!booking)
        return apiError("FORBIDDEN", "You cannot manage this booking.", 403);

      // approve_booking_quote() is the sole writer of total_amount/
      // deposit_amount/approved_at/payment_due_at and is what triggers
      // invoice issuance. A raw status update here previously validated
      // totalAmount/depositAmount via Zod and then discarded them,
      // leaving bookings "approved" with no payable amount and no
      // invoice.
      result = await supabase.rpc("approve_booking_quote", {
        p_booking_id: id,
        p_total_amount: input.totalAmount,
        p_deposit_amount: input.depositAmount,
        p_note: input.note ?? null,
      });
    } else if (input.action === "decline") {
      const booking = await canManageBooking(supabase, id);
      if (!booking)
        return apiError("FORBIDDEN", "You cannot manage this booking.", 403);

      result = await supabase.rpc("decline_booking_request", {
        p_booking_id: id,
        p_reason: input.reason,
      });
    } else if (input.action === "cancel") {
      result = await supabase.rpc("cancel_booking_request", {
        p_booking_id: id,
        p_reason: input.reason?.trim() || null,
      });
    } else {
      result = await supabase.rpc("complete_booking_event", {
        p_booking_id: id,
      });
    }

    if (result.error) {
      return apiError("BOOKING_ACTION_FAILED", result.error.message, 400);
    }

    revalidateBookingViews(id, await getBookingVenueSlug(supabase, id));

    return NextResponse.json({
      data: {
        bookingId: result.data.id,
        status: result.data.status,
      },
      error: null,
    });
  } catch (error) {
    console.error("[api/bookings/status] Unexpected error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
  }
}
