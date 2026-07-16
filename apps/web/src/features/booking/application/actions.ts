"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import { isAdminUser } from "@/src/lib/rbac/guards";
import {
  BookingConflictError,
  ForbiddenError,
  ReviewAlreadyExistsError,
  ReviewBookingNotCompletedError,
  UnauthorizedError,
  ValidationError,
  VenueNotApprovedError,
} from "@/src/lib/errors";
import {
  approveBookingSchema,
  bookingReviewSchema,
  cancelBookingSchema,
  completeBookingSchema,
  declineBookingSchema,
  startBookingPaymentSchema,
} from "../schemas/booking.schema";
import { formatCancellationReason } from "../constants/cancellation-reasons";
import { startCheckout } from "@/src/features/payments/application/use-cases/start-checkout.usecase";
import { createServiceClient } from "@/src/lib/supabase/service";

function bookingErrorFromMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("signed in")) {
    return new UnauthorizedError(message);
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("only the booking customer")
  ) {
    return new ForbiddenError(message);
  }

  if (
    normalized.includes("already has an active booking") ||
    normalized.includes("unavailable on the selected date")
  ) {
    return new BookingConflictError();
  }

  if (normalized.includes("not available for booking")) {
    return new VenueNotApprovedError();
  }

  if (normalized.includes("not completed")) {
    return new ReviewBookingNotCompletedError();
  }

  if (
    normalized.includes("duplicate key") ||
    normalized.includes("already reviewed")
  ) {
    return new ReviewAlreadyExistsError();
  }

  return new ValidationError(message);
}

function throwIfSupabaseError(
  error: { message?: string } | null | undefined,
): void {
  if (error) {
    throw bookingErrorFromMessage(error.message ?? "Booking action failed");
  }
}

function normalizeOptionalString(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function assertCanManageBooking(
  supabase: any,
  bookingId: string,
): Promise<{
  booking: {
    id: string;
    status: string;
    venue_id: string;
    event_date: string;
    venues: { organization_id: string; slug: string | null } | null;
  };
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError("You must be signed in to manage bookings.");
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, status, venue_id, event_date, venues(organization_id, slug)")
    .eq("id", bookingId)
    .maybeSingle();

  throwIfSupabaseError(bookingError);

  if (!booking) {
    throw new ValidationError("Booking not found.");
  }

  const isAdmin = await isAdminUser(supabase, user.id);

  if (isAdmin) {
    return { booking };
  }

  const organizationId = booking.venues?.organization_id;
  if (!organizationId) {
    throw new ForbiddenError(
      "You do not have permission to manage this booking.",
    );
  }

  const [
    { data: membership, error: membershipError },
    { data: organization, error: ownerError },
  ] = await Promise.all([
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

  throwIfSupabaseError(membershipError);
  throwIfSupabaseError(ownerError);

  if (!membership && !organization) {
    throw new ForbiddenError(
      "You do not have permission to manage this booking.",
    );
  }

  return { booking };
}

async function getVenueSlug(supabase: any, venueId: string) {
  const { data } = await supabase
    .from("venues")
    .select("slug")
    .eq("id", venueId)
    .maybeSingle();

  return (data?.slug as string | null | undefined) ?? null;
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
  revalidatePath("/dashboard/coordinator");
  revalidatePath("/dashboard/coordinator/events");
  revalidatePath(`/dashboard/coordinator/events/${bookingId}`);
  revalidatePath("/dashboard/coordinator/calendar");
  revalidatePath("/dashboard/coordinator/reports");
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/venues");

  if (venueSlug) {
    revalidatePath(`/venues/${venueSlug}`);
    revalidatePath(`/venues/${venueSlug}/book`);
  }
}

export async function approveBookingAction(rawInput: unknown) {
  return createServerAction(
    approveBookingSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      // Permission check only — approve_booking_quote() re-validates
      // org membership/admin internally and is the sole writer of
      // total_amount/deposit_amount/approved_at/payment_due_at. A raw
      // table UPDATE here would bypass that validation (and the
      // invoice-issuance trigger, which only fires when this RPC sets a
      // positive deposit_amount) — this previously caused bookings to
      // reach "approved" with a null total/deposit and no invoice.
      const { booking } = await assertCanManageBooking(
        supabase,
        input.bookingId,
      );

      const { data, error } = await supabase.rpc("approve_booking_quote", {
        p_booking_id: input.bookingId,
        p_total_amount: input.totalAmount,
        p_deposit_amount: input.depositAmount,
        p_note: input.note ?? null,
      });

      throwIfSupabaseError(error);

      revalidateBookingViews(input.bookingId, booking.venues?.slug);

      return {
        bookingId: data.id as string,
        status: data.status as string,
        totalAmount: Number(data.total_amount),
        depositAmount: Number(data.deposit_amount),
      };
    },
    rawInput,
  );
}

export async function declineBookingAction(rawInput: unknown) {
  return createServerAction(
    declineBookingSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      // Same reasoning as approveBookingAction: decline_booking_request()
      // is the sole writer of decline_reason — a raw update here
      // previously validated a reason and then silently discarded it.
      const { booking } = await assertCanManageBooking(
        supabase,
        input.bookingId,
      );

      const { data, error } = await supabase.rpc("decline_booking_request", {
        p_booking_id: input.bookingId,
        p_reason: input.reason,
      });

      throwIfSupabaseError(error);

      revalidateBookingViews(input.bookingId, booking.venues?.slug);

      return {
        bookingId: data.id as string,
        status: data.status as string,
      };
    },
    rawInput,
  );
}

export async function cancelBookingAction(rawInput: unknown) {
  return createServerAction(
    cancelBookingSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const { data, error } = await supabase.rpc("cancel_booking_request", {
        p_booking_id: input.bookingId,
        p_reason: formatCancellationReason(
          input.reasonCode,
          input.reasonDetail,
        ),
      });

      throwIfSupabaseError(error);

      revalidateBookingViews(
        input.bookingId,
        await getVenueSlug(supabase, data.venue_id as string),
      );
      revalidatePath(`/bookings/${input.bookingId}/cancel`);

      return {
        bookingId: data.id as string,
        status: data.status as string,
      };
    },
    rawInput,
  );
}

export async function startBookingPaymentAction(rawInput: unknown) {
  return createServerAction(
    startBookingPaymentSchema,
    async (input) => {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
        "http://localhost:3000";
      const supabase = (await createClient()) as any;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const result = await startCheckout(supabase, createServiceClient(), {
        bookingId: input.bookingId,
        provider: input.provider,
        appUrl,
        customerEmail: user?.email ?? null,
      });

      revalidateBookingViews(
        input.bookingId,
        await getBookingVenueSlug(supabase, input.bookingId),
      );
      revalidatePath(`/bookings/${input.bookingId}/payment`);
      revalidatePath(`/bookings/${input.bookingId}/confirmation`);

      return result;
    },
    rawInput,
  );
}

export async function completeBookingAction(rawInput: unknown) {
  return createServerAction(
    completeBookingSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const { data, error } = await supabase.rpc("complete_booking_event", {
        p_booking_id: input.bookingId,
      });

      throwIfSupabaseError(error);

      revalidateBookingViews(
        input.bookingId,
        await getVenueSlug(supabase, data.venue_id as string),
      );

      return {
        bookingId: data.id as string,
        status: data.status as string,
      };
    },
    rawInput,
  );
}

export async function submitBookingReviewAction(rawInput: unknown) {
  return createServerAction(
    bookingReviewSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError(
          "You must be signed in to review a booking.",
        );
      }

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select(
          `
            id,
            customer_id,
            venue_id,
            status,
            event_date,
            venues (
              slug
            ),
            reviews (
              id
            )
          `,
        )
        .eq("id", input.bookingId)
        .eq("customer_id", user.id)
        .maybeSingle();

      throwIfSupabaseError(bookingError);

      if (!booking) {
        throw new ValidationError("Booking not found.");
      }

      if (booking.customer_id !== user.id) {
        throw new ForbiddenError("You can only review your own booking.");
      }

      if (booking.venue_id !== input.venueId) {
        throw new ValidationError("This booking does not match the venue.");
      }

      if (booking.status !== "completed") {
        throw new ReviewBookingNotCompletedError();
      }

      if ((booking.reviews ?? []).length > 0) {
        throw new ReviewAlreadyExistsError();
      }

      const { data, error } = await supabase
        .from("reviews")
        .insert({
          booking_id: input.bookingId,
          venue_id: booking.venue_id,
          customer_id: user.id,
          overall_rating: input.overallRating,
          venue_quality: input.venueQuality ?? null,
          cleanliness: input.cleanliness ?? null,
          staff_service: input.staffService ?? null,
          facilities: input.facilities ?? null,
          accessibility: input.accessibility ?? null,
          value_for_money: input.valueForMoney ?? null,
          food_quality: input.foodQuality ?? null,
          ambience: input.ambience ?? null,
          comment: normalizeOptionalString(input.comment),
          status: "published",
        })
        .select("id")
        .single();

      throwIfSupabaseError(error);

      revalidatePath("/bookings");
      revalidatePath(`/bookings/${input.bookingId}`);
      revalidatePath(`/bookings/${input.bookingId}/review`);
      revalidatePath("/venues");

      const venue = Array.isArray(booking.venues)
        ? booking.venues[0]
        : booking.venues;
      if (venue?.slug) {
        revalidatePath(`/venues/${venue.slug}`);
      }

      return {
        reviewId: data.id as string,
        bookingId: input.bookingId,
      };
    },
    rawInput,
  );
}
