"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
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
  createBookingSchema,
  declineBookingSchema,
  startBookingPaymentSchema,
} from "../schemas/booking.schema";
import { formatCancellationReason } from "../constants/cancellation-reasons";

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
    venues: { organization_id: string } | null;
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
    .select("id, status, venues(organization_id)")
    .eq("id", bookingId)
    .maybeSingle();

  throwIfSupabaseError(bookingError);

  if (!booking) {
    throw new ValidationError("Booking not found.");
  }

  const { data: roleRows, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  throwIfSupabaseError(rolesError);

  const isAdmin = (roleRows ?? []).some(
    (row: { role: string }) => row.role === "admin",
  );

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

function revalidateBookingViews(bookingId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/venue-owner");
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
}

export async function createBookingAction(rawInput: unknown) {
  return createServerAction(
    createBookingSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError(
          "You must be signed in to submit a booking inquiry.",
        );
      }

      const { data, error } = await supabase.rpc("create_booking_inquiry", {
        p_venue_id: input.venueId,
        p_package_id: input.packageId || null,
        p_event_date: input.eventDate,
        p_guest_count: input.guestCount,
        p_special_requests: normalizeOptionalString(input.specialRequests),
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

        throwIfSupabaseError(venueError);

        const capacityMin = venue.capacity_min ?? 1;
        const capacityMax = venue.capacity_max ?? capacityMin;

        if (input.guestCount < capacityMin || input.guestCount > capacityMax) {
          throw new ValidationError(
            "Guest count is outside this venue capacity.",
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

          throwIfSupabaseError(packageError);

          if (
            (selectedPackage.min_guests !== null &&
              input.guestCount < selectedPackage.min_guests) ||
            (selectedPackage.max_guests !== null &&
              input.guestCount > selectedPackage.max_guests)
          ) {
            throw new ValidationError(
              "Guest count is outside the selected package limits.",
            );
          }
        }

        const { data: availability, error: availabilityError } = await supabase
          .from("venue_availability")
          .select("status")
          .eq("venue_id", input.venueId)
          .eq("date", input.eventDate)
          .maybeSingle();

        throwIfSupabaseError(availabilityError);

        if (
          availability &&
          ["reserved", "maintenance", "blackout"].includes(availability.status)
        ) {
          throw new BookingConflictError();
        }

        const { data: conflicts, error: conflictsError } = await supabase
          .from("bookings")
          .select("id")
          .eq("venue_id", input.venueId)
          .eq("event_date", input.eventDate)
          .in("status", ["pending", "approved", "completed"])
          .limit(1);

        throwIfSupabaseError(conflictsError);

        if ((conflicts ?? []).length > 0) {
          throw new BookingConflictError();
        }

        const fallbackInsert = {
          venue_id: input.venueId,
          customer_id: user.id,
          package_id: input.packageId || null,
          event_date: input.eventDate,
          guest_count: input.guestCount,
          status: "pending",
          special_requests: normalizeOptionalString(input.specialRequests),
        };

        const { data: insertedBooking, error: insertError } = await supabase
          .from("bookings")
          .insert(fallbackInsert)
          .select("id, status, event_date")
          .single();

        throwIfSupabaseError(insertError);

        revalidatePath("/bookings");
        revalidatePath(`/bookings/${insertedBooking.id}`);

        return {
          bookingId: insertedBooking.id as string,
          status: insertedBooking.status as string,
          eventDate: insertedBooking.event_date as string,
        };
      }

      throwIfSupabaseError(error);

      revalidatePath("/bookings");
      revalidatePath(`/bookings/${data.id}`);

      return {
        bookingId: data.id as string,
        status: data.status as string,
        eventDate: data.event_date as string,
      };
    },
    rawInput,
  );
}

export async function approveBookingAction(rawInput: unknown) {
  return createServerAction(
    approveBookingSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const { booking } = await assertCanManageBooking(
        supabase,
        input.bookingId,
      );

      if (booking.status !== "pending") {
        throw new ValidationError("Only pending bookings can be approved.");
      }

      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: "approved",
        })
        .eq("id", input.bookingId)
        .eq("status", "pending")
        .select("id, status")
        .single();

      throwIfSupabaseError(error);

      revalidateBookingViews(input.bookingId);

      return {
        bookingId: data.id as string,
        status: data.status as string,
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
      const { booking } = await assertCanManageBooking(
        supabase,
        input.bookingId,
      );

      if (booking.status !== "pending") {
        throw new ValidationError("Only pending bookings can be declined.");
      }

      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: "declined",
        })
        .eq("id", input.bookingId)
        .eq("status", "pending")
        .select("id, status")
        .single();

      throwIfSupabaseError(error);

      revalidateBookingViews(input.bookingId);

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

      revalidatePath("/bookings");
      revalidatePath(`/bookings/${input.bookingId}`);
      revalidatePath(`/bookings/${input.bookingId}/cancel`);
      revalidatePath("/dashboard/bookings");
      revalidatePath(`/dashboard/bookings/${input.bookingId}`);

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
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.VERCEL_URL?.replace(/^/, "https://") ??
        "http://localhost:3000";
      const checkoutUrl = `${appUrl}/bookings/${input.bookingId}/confirmation`;
      const supabase = (await createClient()) as any;

      const { data, error } = await supabase.rpc("start_booking_payment", {
        p_booking_id: input.bookingId,
        p_payment_provider: input.provider,
        p_checkout_url: checkoutUrl,
        p_provider_reference: null,
      });

      throwIfSupabaseError(error);

      revalidatePath("/bookings");
      revalidatePath(`/bookings/${input.bookingId}`);
      revalidatePath(`/bookings/${input.bookingId}/payment`);
      revalidatePath(`/bookings/${input.bookingId}/confirmation`);

      return {
        bookingId: input.bookingId,
        transactionId: data.id as string,
        amount: Number(data.amount ?? 0),
        provider: data.payment_provider as string,
        checkoutUrl: (data.checkout_url as string | null) ?? checkoutUrl,
        status: data.status as string,
      };
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

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/venue-owner");
      revalidatePath("/dashboard/bookings");
      revalidatePath(`/dashboard/bookings/${input.bookingId}`);
      revalidatePath("/bookings");
      revalidatePath(`/bookings/${input.bookingId}`);

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

      const { data, error } = await supabase
        .from("reviews")
        .insert({
          booking_id: input.bookingId,
          venue_id: input.venueId,
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
      revalidatePath(`/venues/${input.venueId}`);

      return {
        reviewId: data.id as string,
        bookingId: input.bookingId,
      };
    },
    rawInput,
  );
}
