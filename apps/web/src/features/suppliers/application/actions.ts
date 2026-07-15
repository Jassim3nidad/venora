"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/src/lib/errors";
import {
  archiveSupplierPackageSchema,
  supplierContactRequestSchema,
  supplierPackageSchema,
  supplierPortfolioSchema,
  supplierProfileSchema,
  toggleSupplierFavoriteSchema,
  supplierQuoteActionSchema,
} from "../schemas/supplier.schema";

function normalizeOptionalString(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalNumber(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function throwIfSupabaseError(error: { message?: string } | null | undefined) {
  if (!error) return;
  throw new ValidationError(error.message ?? "Supplier action failed");
}

async function requireUser() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError("Please sign in to continue.");
  }

  return { supabase, user };
}

async function getOwnedSupplierProfile(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("supplier_profiles")
    .select("id, business_name, profile_id, slug")
    .eq("profile_id", userId)
    .maybeSingle();

  throwIfSupabaseError(error);
  return data as {
    id: string;
    business_name: string;
    profile_id: string;
    slug: string | null;
  } | null;
}

async function generateUniqueSlug(
  supabase: any,
  baseSlug: string,
  excludeId?: string,
) {
  let slug = baseSlug || "supplier";
  let counter = 1;
  while (true) {
    let query = supabase
      .from("supplier_profiles")
      .select("id")
      .eq("slug", slug);
    if (excludeId) query = query.neq("id", excludeId);

    const { data } = await query.maybeSingle();
    if (!data) return slug;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export async function upsertSupplierProfileAction(rawInput: unknown) {
  return createServerAction(
    supplierProfileSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      const existing = await getOwnedSupplierProfile(supabase, user.id);
      const payload = {
        profile_id: user.id,
        business_name: input.businessName,
        category_id: input.categoryId ?? null,
        headline: normalizeOptionalString(input.headline),
        description: normalizeOptionalString(input.description),
        base_price: normalizeOptionalNumber(input.basePrice),
        price_unit: input.priceUnit,
        service_areas: input.serviceAreas,
        coverage_radius_km: normalizeOptionalNumber(input.coverageRadiusKm),
        contact_email: normalizeOptionalString(input.contactEmail),
        contact_phone: normalizeOptionalString(input.contactPhone),
        website_url: normalizeOptionalString(input.websiteUrl),
        instagram_url: normalizeOptionalString(input.instagramUrl),
        profile_image_url: normalizeOptionalString(input.profileImageUrl),
        hero_image_url: normalizeOptionalString(input.heroImageUrl),
        response_time_hours: input.responseTimeHours,
        years_in_business: normalizeOptionalNumber(input.yearsInBusiness),
        team_size: normalizeOptionalNumber(input.teamSize),
        minimum_booking_notice_days: input.minimumBookingNoticeDays,
        business_location_type: input.businessLocationType,
        location_visibility: input.locationVisibility,
        latitude: normalizeOptionalNumber(input.latitude),
        longitude: normalizeOptionalNumber(input.longitude),
        city: normalizeOptionalString(input.city),
        province: normalizeOptionalString(input.province),
        country: normalizeOptionalString(input.country),
        business_address: normalizeOptionalString(input.businessAddress),
        public_location_label: normalizeOptionalString(
          input.publicLocationLabel,
        ),
        travel_available: input.travelAvailable,
        travel_fee_note: normalizeOptionalString(input.travelFeeNote),
      };

      const baseSlug = input.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const slug = await generateUniqueSlug(supabase, baseSlug, existing?.id);

      const { data, error } = existing
        ? await supabase
            .from("supplier_profiles")
            .update({ ...payload, slug })
            .eq("id", existing.id)
            .select("id, slug")
            .single()
        : await supabase
            .from("supplier_profiles")
            .insert({ ...payload, slug })
            .select("id, slug")
            .single();

      throwIfSupabaseError(error);

      revalidatePath("/suppliers");
      if (existing?.id) revalidatePath(`/suppliers/${existing.id}`);
      revalidatePath(`/suppliers/${data.id}`);
      revalidatePath("/dashboard/supplier");
      revalidatePath("/dashboard/supplier/profile");

      return {
        supplierId: data.id as string,
        slug: data.slug as string,
      };
    },
    rawInput,
  );
}

export async function upsertSupplierPackageAction(rawInput: unknown) {
  return createServerAction(
    supplierPackageSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      const supplier = await getOwnedSupplierProfile(supabase, user.id);

      if (!supplier) {
        throw new NotFoundError("Supplier profile");
      }

      if (input.supplierId && input.supplierId !== supplier.id) {
        throw new ForbiddenError(
          "You can only manage your own supplier packages.",
        );
      }

      const payload = {
        supplier_id: supplier.id,
        name: input.name,
        description: normalizeOptionalString(input.description),
        price: normalizeOptionalNumber(input.price),
        price_unit: input.priceUnit,
        package_type: input.packageType,
        inclusions: input.inclusions,
        min_guests: normalizeOptionalNumber(input.minGuests),
        max_guests: normalizeOptionalNumber(input.maxGuests),
        is_active: input.isActive,
        sort_order: input.sortOrder,
      };

      const { data, error } = input.id
        ? await supabase
            .from("supplier_services")
            .update(payload)
            .eq("id", input.id)
            .eq("supplier_id", supplier.id)
            .select("id")
            .single()
        : await supabase
            .from("supplier_services")
            .insert(payload)
            .select("id")
            .single();

      throwIfSupabaseError(error);

      revalidatePath("/suppliers");
      revalidatePath(`/suppliers/${supplier.id}`);
      revalidatePath("/dashboard/supplier");
      revalidatePath("/dashboard/supplier/services");

      return {
        packageId: data.id as string,
        supplierId: supplier.id,
      };
    },
    rawInput,
  );
}

export async function archiveSupplierPackageAction(rawInput: unknown) {
  return createServerAction(
    archiveSupplierPackageSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      const supplier = await getOwnedSupplierProfile(supabase, user.id);
      if (!supplier) throw new NotFoundError("Supplier profile");

      const { error } = await supabase
        .from("supplier_services")
        .update({ is_active: false })
        .eq("id", input.id)
        .eq("supplier_id", supplier.id);

      throwIfSupabaseError(error);

      revalidatePath("/suppliers");
      revalidatePath(`/suppliers/${supplier.id}`);
      revalidatePath("/dashboard/supplier/services");

      return { packageId: input.id };
    },
    rawInput,
  );
}

export async function upsertSupplierPortfolioAction(rawInput: unknown) {
  return createServerAction(
    supplierPortfolioSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      const supplier = await getOwnedSupplierProfile(supabase, user.id);

      if (!supplier) {
        throw new NotFoundError("Supplier profile");
      }

      if (input.supplierId && input.supplierId !== supplier.id) {
        throw new ForbiddenError(
          "You can only manage your own supplier portfolio.",
        );
      }

      // Map sort_order based on status
      const finalSortOrder = input.sortOrder ?? 0;

      const payload = {
        supplier_id: supplier.id,
        title: input.title ?? "Untitled Project",
        description: normalizeOptionalString(input.description),
        // Use the proper image_urls array column (migration 070)
        image_urls: input.imageUrls,
        // Cover image for backwards compat
        image_url:
          input.imageUrls.length > 0
            ? input.imageUrls[0]
            : (normalizeOptionalString(input.imageUrl) ?? null),
        event_type: normalizeOptionalString(input.eventType),
        city: normalizeOptionalString(input.city),
        province: normalizeOptionalString(input.province),
        venue_name: normalizeOptionalString(input.venueName),
        event_date: normalizeOptionalString(input.eventDate),
        is_featured: input.isFeatured,
        sort_order: finalSortOrder,
        status: input.status,
        service_id: input.serviceId ?? null,
      };

      const { data, error } = input.id
        ? await supabase
            .from("supplier_portfolio_items")
            .update(payload)
            .eq("id", input.id)
            .eq("supplier_id", supplier.id)
            .select("id")
            .single()
        : await supabase
            .from("supplier_portfolio_items")
            .insert(payload)
            .select("id")
            .single();

      throwIfSupabaseError(error);

      revalidatePath("/suppliers");
      if (supplier.slug) revalidatePath(`/suppliers/${supplier.slug}`);
      revalidatePath("/dashboard/supplier");
      revalidatePath("/dashboard/supplier/portfolio");

      return {
        portfolioItemId: data.id as string,
        supplierId: supplier.id,
      };
    },
    rawInput,
  );
}

export async function createSupplierContactRequestAction(rawInput: unknown) {
  return createServerAction(
    supplierContactRequestSchema,
    async (input) => {
      const { supabase, user } = await requireUser();

      const { data: supplier, error: supplierError } = await supabase
        .from("supplier_profiles")
        .select("id, accreditation_status")
        .eq("id", input.supplierId)
        .eq("accreditation_status", "accredited")
        .single();

      throwIfSupabaseError(supplierError);

      if (!supplier) {
        throw new NotFoundError("Supplier");
      }

      let eventDate = normalizeOptionalString(input.eventDate);
      let eventLocation = normalizeOptionalString(input.eventLocation);
      let guestCount = normalizeOptionalNumber(input.guestCount);

      let venueId: string | undefined = undefined;
      let venueNameSnapshot: string | undefined = undefined;
      let eventStartTimeSnapshot: string | undefined = undefined;

      let eventDateSnapshot: string | undefined = undefined;
      let guestCountSnapshot: number | undefined = undefined;

      if (input.bookingId) {
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .select(
            `
            id,
            status,
            event_date,
            event_start_time,
            guest_count,
            venue_id,
            venues(name, city, province)
          `,
          )
          .eq("id", input.bookingId)
          .eq("customer_id", user.id)
          .in("status", ["approved", "confirmed"])
          .maybeSingle();

        throwIfSupabaseError(bookingError);

        if (!booking) {
          throw new ValidationError(
            "You can only link an approved venue booking to a supplier inquiry. Pending, declined, or cancelled bookings are not accepted.",
          );
        }

        const venue = booking.venues as {
          name?: string | null;
          city?: string | null;
          province?: string | null;
        } | null;
        const venueName = venue?.name ?? "Venue booking";
        const locationParts = [venue?.city, venue?.province].filter(Boolean);
        const locationSuffix =
          locationParts.length > 0
            ? locationParts.join(", ")
            : "Location unavailable";

        eventLocation = `${venueName} — ${locationSuffix}`;
        eventDate = booking.event_date ?? eventDate;
        guestCount =
          typeof booking.guest_count === "number"
            ? booking.guest_count
            : guestCount;

        venueId = booking.venue_id;
        venueNameSnapshot = venueName;
        eventStartTimeSnapshot = booking.event_start_time ?? undefined;
        eventDateSnapshot = booking.event_date ?? undefined;
        guestCountSnapshot =
          typeof booking.guest_count === "number"
            ? booking.guest_count
            : undefined;
      }

      if (eventDate) {
        const { data: availability, error: availabilityError } = await supabase
          .from("supplier_availability")
          .select("status")
          .eq("supplier_id", input.supplierId)
          .eq("date", eventDate)
          .in("status", ["blocked", "unavailable"])
          .maybeSingle();

        throwIfSupabaseError(availabilityError);

        if (availability) {
          throw new ValidationError(
            "This supplier is unavailable on the selected date. Please choose another date.",
          );
        }
      }

      const { data, error } = await supabase
        .from("supplier_contact_requests")
        .insert({
          supplier_id: input.supplierId,
          service_id: input.serviceId ?? null,
          customer_id: user.id,
          booking_id: input.bookingId ?? null,
          venue_id: venueId ?? null,
          contact_name: input.contactName,
          contact_email: input.contactEmail,
          contact_phone: normalizeOptionalString(input.contactPhone),
          event_date: eventDate,
          event_location: eventLocation,
          guest_count: guestCount,
          message: input.message,
          venue_name_snapshot: venueNameSnapshot ?? null,
          event_start_time_snapshot: eventStartTimeSnapshot ?? null,
          location_snapshot: eventLocation ?? null,
          event_date_snapshot: eventDateSnapshot ?? null,
          guest_count_snapshot: guestCountSnapshot ?? null,
        })
        .select("id, status")
        .single();

      throwIfSupabaseError(error);

      revalidatePath(`/suppliers/${supplier.id}`);
      revalidatePath("/dashboard/supplier");
      revalidatePath("/dashboard/supplier/inquiries");
      revalidatePath("/bookings");
      revalidatePath("/inquiries");

      return {
        requestId: data.id as string,
        status: data.status as string,
      };
    },
    rawInput,
  );
}

export async function toggleSupplierFavoriteAction(rawInput: unknown) {
  return createServerAction(
    toggleSupplierFavoriteSchema,
    async ({ supplierId }) => {
      const { supabase, user } = await requireUser();

      const { data: existing } = await supabase
        .from("supplier_favorites")
        .select("customer_id")
        .eq("customer_id", user.id)
        .eq("supplier_id", supplierId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("supplier_favorites")
          .delete()
          .eq("customer_id", user.id)
          .eq("supplier_id", supplierId);

        throwIfSupabaseError(error);
        revalidatePath("/favorites");
        revalidatePath("/suppliers");

        return { isFavorited: false };
      }

      const { error } = await supabase.from("supplier_favorites").insert({
        customer_id: user.id,
        supplier_id: supplierId,
      });

      throwIfSupabaseError(error);
      revalidatePath("/favorites");
      revalidatePath("/suppliers");

      return { isFavorited: true };
    },
    rawInput,
  );
}

export async function acceptSupplierQuoteAction(rawInput: unknown) {
  return createServerAction(
    supplierQuoteActionSchema,
    async (input) => {
      const { supabase } = await requireUser();

      const { data, error } = await supabase.rpc(
        "respond_supplier_quote_customer",
        {
          p_quote_id: input.quoteId,
          p_status: "accepted",
        },
      );

      throwIfSupabaseError(error);

      revalidatePath("/bookings");
      revalidatePath("/inquiries");
      revalidatePath("/dashboard/supplier/inquiries");
      if (data?.inquiry_id) {
        revalidatePath(`/inquiries/${data.inquiry_id}`);
        revalidatePath(`/dashboard/supplier/inquiries/${data.inquiry_id}`);
      }

      return { success: true };
    },
    rawInput,
  );
}

export async function declineSupplierQuoteAction(rawInput: unknown) {
  return createServerAction(
    supplierQuoteActionSchema,
    async (input) => {
      const { supabase } = await requireUser();

      const { data, error } = await supabase.rpc(
        "respond_supplier_quote_customer",
        {
          p_quote_id: input.quoteId,
          p_status: "declined",
        },
      );

      throwIfSupabaseError(error);

      revalidatePath("/bookings");
      revalidatePath("/inquiries");
      revalidatePath("/dashboard/supplier/inquiries");
      if (data?.inquiry_id) {
        revalidatePath(`/inquiries/${data.inquiry_id}`);
        revalidatePath(`/dashboard/supplier/inquiries/${data.inquiry_id}`);
      }

      return { success: true };
    },
    rawInput,
  );
}

export async function sendCustomerInquiryMessageAction(rawInput: unknown) {
  return createServerAction(
    z.object({ inquiryId: z.string().uuid(), message: z.string().min(1) }),
    async (input) => {
      const { supabase, user } = await requireUser();

      // Verify the customer owns this inquiry
      const { data: inquiry, error: inquiryError } = await supabase
        .from("supplier_contact_requests")
        .select("id")
        .eq("id", input.inquiryId)
        .eq("customer_id", user.id)
        .single();

      if (inquiryError || !inquiry) {
        throw new Error("Unauthorized to send message for this inquiry");
      }

      const { data, error } = await supabase
        .from("supplier_inquiry_messages")
        .insert({
          inquiry_id: input.inquiryId,
          sender_id: user.id,
          message: input.message,
        })
        .select("id")
        .single();

      throwIfSupabaseError(error);

      revalidatePath("/bookings");
      revalidatePath("/inquiries");
      revalidatePath(`/inquiries/${input.inquiryId}`);
      revalidatePath(`/dashboard/supplier/inquiries/${input.inquiryId}`);
      return { messageId: data.id as string };
    },
    rawInput,
  );
}
