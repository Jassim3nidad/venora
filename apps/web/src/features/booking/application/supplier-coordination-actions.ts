"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/src/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/src/lib/errors";

const attachSupplierSchema = z.object({
  bookingId: z.string().uuid(),
  supplierId: z.string().uuid(),
  serviceId: z.string().uuid().optional().nullable(),
  agreedPrice: z.coerce.number().nonnegative().optional().nullable(),
});

const cancelAttachedSupplierSchema = z.object({
  bookingSupplierId: z.string().uuid(),
  bookingId: z.string().uuid(),
});

async function assertCanAttachSupplier(supabase: any, bookingId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError("You must be signed in to attach suppliers.");
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, venue_id, venues(id, organization_id)")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking?.venue_id || !booking.venues) {
    throw new ValidationError("Booking not found.");
  }

  const venue = Array.isArray(booking.venues)
    ? booking.venues[0]
    : booking.venues;
  const organizationId = venue?.organization_id as string | undefined;

  if (!organizationId) {
    throw new ValidationError("Booking venue is missing an organization.");
  }

  const [{ data: roleRows }, { data: organization }, { data: membership }] =
    await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase
        .from("organizations")
        .select("id")
        .eq("id", organizationId)
        .eq("owner_id", user.id)
        .maybeSingle(),
      supabase
        .from("organization_members")
        .select("role, status, permissions")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);

  const isAdmin = (roleRows ?? []).some(
    (row: { role: string }) => row.role === "admin",
  );
  const isOwner = Boolean(organization);

  if (isAdmin || isOwner) {
    return {
      user,
      booking: {
        id: booking.id as string,
        venue_id: booking.venue_id as string,
      },
    };
  }

  if (!membership || membership.role !== "coordinator") {
    throw new ForbiddenError(
      "Only organization owners or assigned coordinators can attach suppliers.",
    );
  }

  const permissions = Array.isArray(membership.permissions)
    ? (membership.permissions as string[])
    : [];

  if (!permissions.includes("coordinate_accredited_suppliers")) {
    throw new ForbiddenError(
      "You do not have permission to attach suppliers to bookings.",
    );
  }

  const { data: assignment } = await supabase
    .from("venue_coordinator_assignments")
    .select("venue_id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("venue_id", booking.venue_id)
    .maybeSingle();

  if (!assignment) {
    throw new ForbiddenError(
      "You are not assigned to this venue and cannot attach suppliers.",
    );
  }

  return {
    user,
    booking: {
      id: booking.id as string,
      venue_id: booking.venue_id as string,
    },
  };
}

function revalidateBookingSupplierViews(bookingId: string) {
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath(`/dashboard/bookings/${bookingId}/assign-supplier`);
  revalidatePath(`/dashboard/coordinator/bookings/${bookingId}`);
  revalidatePath(
    `/dashboard/coordinator/bookings/${bookingId}/assign-supplier`,
  );
  revalidatePath("/dashboard/supplier/bookings");
  revalidatePath("/dashboard/coordinator/suppliers");
}

/** @deprecated Prefer attachSupplierToBookingAction — kept for form migration. */
export async function assignSupplierToBooking(
  bookingId: string,
  supplierId: string,
  _serviceDate: string | null,
  _arrivalTime: string | null,
  _notes: string | null,
) {
  const result = await attachSupplierToBookingAction({
    bookingId,
    supplierId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export async function attachSupplierToBookingAction(rawInput: unknown) {
  return createServerAction(
    attachSupplierSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const { booking } = await assertCanAttachSupplier(
        supabase,
        input.bookingId,
      );

      const { data: venueLink } = await supabase
        .from("venue_suppliers")
        .select("supplier_id")
        .eq("venue_id", booking.venue_id)
        .eq("supplier_id", input.supplierId)
        .maybeSingle();

      if (!venueLink) {
        throw new ValidationError(
          "Choose an accredited supplier associated with this venue.",
        );
      }

      const { data: supplierProfile } = await supabase
        .from("supplier_profiles")
        .select("id, accreditation_status")
        .eq("id", input.supplierId)
        .maybeSingle();

      if (
        !supplierProfile ||
        supplierProfile.accreditation_status !== "accredited"
      ) {
        throw new ValidationError(
          "Only accredited suppliers can be attached to a booking.",
        );
      }

      if (input.serviceId) {
        const { data: service } = await supabase
          .from("supplier_services")
          .select("id")
          .eq("id", input.serviceId)
          .eq("supplier_id", input.supplierId)
          .maybeSingle();

        if (!service) {
          throw new ValidationError(
            "Selected service does not belong to this supplier.",
          );
        }
      }

      const { data: existing } = await supabase
        .from("booking_suppliers")
        .select("id, status")
        .eq("booking_id", input.bookingId)
        .eq("supplier_id", input.supplierId)
        .maybeSingle();

      if (existing && existing.status !== "cancelled") {
        throw new ValidationError(
          "This supplier is already attached to the booking.",
        );
      }

      const payload = {
        booking_id: input.bookingId,
        supplier_id: input.supplierId,
        service_id: input.serviceId || null,
        agreed_price:
          input.agreedPrice === undefined || input.agreedPrice === null
            ? null
            : input.agreedPrice,
        status: "confirmed",
      };

      const writeResult = existing
        ? await supabase
            .from("booking_suppliers")
            .update(payload)
            .eq("id", existing.id)
            .select("id, status")
            .single()
        : await supabase
            .from("booking_suppliers")
            .insert(payload)
            .select("id, status")
            .single();

      if (writeResult.error) {
        throw new ValidationError(
          writeResult.error.message || "Unable to attach supplier.",
        );
      }

      revalidateBookingSupplierViews(input.bookingId);
      return {
        bookingSupplierId: writeResult.data.id as string,
        status: writeResult.data.status as string,
      };
    },
    rawInput,
  );
}

export async function cancelAttachedSupplierAction(rawInput: unknown) {
  return createServerAction(
    cancelAttachedSupplierSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      await assertCanAttachSupplier(supabase, input.bookingId);

      const { data: row, error: selectError } = await supabase
        .from("booking_suppliers")
        .select("id, booking_id, status")
        .eq("id", input.bookingSupplierId)
        .eq("booking_id", input.bookingId)
        .maybeSingle();

      if (selectError || !row) {
        throw new ValidationError("Attached supplier not found.");
      }

      if (row.status === "cancelled") {
        return { bookingSupplierId: row.id as string, status: "cancelled" };
      }

      const { error } = await supabase
        .from("booking_suppliers")
        .update({ status: "cancelled" })
        .eq("id", input.bookingSupplierId);

      if (error) {
        throw new ValidationError("Unable to cancel this supplier attachment.");
      }

      revalidateBookingSupplierViews(input.bookingId);
      return { bookingSupplierId: row.id as string, status: "cancelled" };
    },
    rawInput,
  );
}
