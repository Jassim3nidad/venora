"use server";

import { revalidatePath } from "next/cache";
import { slugify } from "@venora/lib";
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

function supplierSlug(businessName: string, userId: string) {
  const base = slugify(businessName) || "supplier";
  return `${base}-${userId.slice(0, 8)}`;
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
    .select("id, slug, business_name, profile_id")
    .eq("profile_id", userId)
    .maybeSingle();

  throwIfSupabaseError(error);
  return data as { id: string; slug: string; business_name: string; profile_id: string } | null;
}

export async function upsertSupplierProfileAction(rawInput: unknown) {
  return createServerAction(supplierProfileSchema, async (input) => {
    const { supabase, user } = await requireUser();
    const existing = await getOwnedSupplierProfile(supabase, user.id);
    const slug = supplierSlug(input.businessName, user.id);
    const payload = {
      profile_id: user.id,
      business_name: input.businessName,
      slug,
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
    };

    const { data, error } = existing
      ? await supabase
          .from("supplier_profiles")
          .update(payload)
          .eq("id", existing.id)
          .select("id, slug")
          .single()
      : await supabase
          .from("supplier_profiles")
          .insert(payload)
          .select("id, slug")
          .single();

    throwIfSupabaseError(error);

    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${existing?.slug ?? data.slug}`);
    revalidatePath(`/suppliers/${data.slug}`);
    revalidatePath("/dashboard/supplier");
    revalidatePath("/dashboard/supplier/profile");

    return {
      supplierId: data.id as string,
      slug: data.slug as string,
    };
  }, rawInput);
}

export async function upsertSupplierPackageAction(rawInput: unknown) {
  return createServerAction(supplierPackageSchema, async (input) => {
    const { supabase, user } = await requireUser();
    const supplier = await getOwnedSupplierProfile(supabase, user.id);

    if (!supplier) {
      throw new NotFoundError("Supplier profile");
    }

    if (input.supplierId && input.supplierId !== supplier.id) {
      throw new ForbiddenError("You can only manage your own supplier packages.");
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
    revalidatePath(`/suppliers/${supplier.slug}`);
    revalidatePath("/dashboard/supplier");
    revalidatePath("/dashboard/supplier/services");

    return {
      packageId: data.id as string,
      supplierId: supplier.id,
    };
  }, rawInput);
}

export async function archiveSupplierPackageAction(rawInput: unknown) {
  return createServerAction(archiveSupplierPackageSchema, async (input) => {
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
    revalidatePath(`/suppliers/${supplier.slug}`);
    revalidatePath("/dashboard/supplier/services");

    return { packageId: input.id };
  }, rawInput);
}

export async function upsertSupplierPortfolioAction(rawInput: unknown) {
  return createServerAction(supplierPortfolioSchema, async (input) => {
    const { supabase, user } = await requireUser();
    const supplier = await getOwnedSupplierProfile(supabase, user.id);

    if (!supplier) {
      throw new NotFoundError("Supplier profile");
    }

    if (input.supplierId && input.supplierId !== supplier.id) {
      throw new ForbiddenError("You can only manage your own supplier portfolio.");
    }

    const payload = {
      supplier_id: supplier.id,
      title: input.title,
      description: normalizeOptionalString(input.description),
      image_url: input.imageUrl,
      event_type: normalizeOptionalString(input.eventType),
      city: normalizeOptionalString(input.city),
      province: normalizeOptionalString(input.province),
      event_date: normalizeOptionalString(input.eventDate),
      is_featured: input.isFeatured,
      sort_order: input.sortOrder,
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
    revalidatePath(`/suppliers/${supplier.slug}`);
    revalidatePath("/dashboard/supplier");
    revalidatePath("/dashboard/supplier/portfolio");

    return {
      portfolioItemId: data.id as string,
      supplierId: supplier.id,
    };
  }, rawInput);
}

export async function createSupplierContactRequestAction(rawInput: unknown) {
  return createServerAction(supplierContactRequestSchema, async (input) => {
    const { supabase, user } = await requireUser();

    const { data: supplier, error: supplierError } = await supabase
      .from("supplier_profiles")
      .select("id, slug, accreditation_status")
      .eq("id", input.supplierId)
      .eq("accreditation_status", "accredited")
      .single();

    throwIfSupabaseError(supplierError);

    if (!supplier) {
      throw new NotFoundError("Supplier");
    }

    const { data, error } = await supabase
      .from("supplier_contact_requests")
      .insert({
        supplier_id: input.supplierId,
        service_id: input.serviceId ?? null,
        customer_id: user.id,
        contact_name: input.contactName,
        contact_email: input.contactEmail,
        contact_phone: normalizeOptionalString(input.contactPhone),
        event_date: normalizeOptionalString(input.eventDate),
        event_location: normalizeOptionalString(input.eventLocation),
        guest_count: normalizeOptionalNumber(input.guestCount),
        message: input.message,
      })
      .select("id, status")
      .single();

    throwIfSupabaseError(error);

    revalidatePath(`/suppliers/${supplier.slug}`);
    revalidatePath("/dashboard/supplier");
    revalidatePath("/dashboard/supplier/inquiries");

    return {
      requestId: data.id as string,
      status: data.status as string,
    };
  }, rawInput);
}
