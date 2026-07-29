"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError } from "@/src/lib/errors";

async function requireVenueOwnerContext() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UnauthorizedError("Please sign in to continue.");

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
  const isAdmin = roles.includes("admin");
  const isVenueOwner = roles.includes("venue_owner");
  const isEventCoordinator = roles.includes("event_coordinator");

  const { data: memberRows } = await supabase
    .from("organization_members")
    .select("organization_id, permissions")
    .eq("user_id", user.id)
    .eq("status", "active");

  const permissions = Array.from(
    new Set(
      (memberRows ?? []).flatMap(
        (m: { permissions: string[] | null }) => m.permissions ?? [],
      ),
    ),
  );

  const canManageAsCoordinator =
    isEventCoordinator &&
    permissions.includes("manage_assigned_venue_listings");

  if (!isAdmin && !isVenueOwner && !canManageAsCoordinator) {
    throw new ForbiddenError(
      "Only venue owners, admins, or coordinators with listing management can manage packages.",
    );
  }

  return {
    supabase,
    user,
    isAdmin,
    isVenueOwner,
    isEventCoordinator,
    canManageAsCoordinator,
    roles,
  };
}

async function assertCanWriteVenuePackage(args: {
  supabase: any;
  userId: string;
  venueId: string;
  isAdmin: boolean;
  isVenueOwner: boolean;
  canManageAsCoordinator: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    supabase,
    userId,
    venueId,
    isAdmin,
    isVenueOwner,
    canManageAsCoordinator,
  } = args;

  if (isAdmin) return { ok: true };

  const { data: venueCheck } = await supabase
    .from("venues")
    .select("id, organization_id")
    .eq("id", venueId)
    .maybeSingle();

  if (!venueCheck) {
    return { ok: false, error: "Venue not found." };
  }

  const { data: memberCheck } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", venueCheck.organization_id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const { data: orgCheck } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", venueCheck.organization_id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (!memberCheck && !orgCheck) {
    return {
      ok: false,
      error: "You are not authorized to manage this venue.",
    };
  }

  if (!isVenueOwner && canManageAsCoordinator) {
    const { data: assignment } = await supabase
      .from("venue_coordinator_assignments")
      .select("id")
      .eq("venue_id", venueId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!assignment) {
      return {
        ok: false,
        error: "You are not assigned to this venue.",
      };
    }
  }

  return { ok: true };
}

export type CreatePackageInput = {
  venueId: string;
  name: string;
  description: string;
  eventTypeId: string | null;
  minGuests: number | null;
  maxGuests: number | null;
  price: number;
  priceUnit: string;
  depositPercentage: number | null;
  depositFlatAmount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  amenityIds: string[];
  venueRules: string;
  inclusions: string[];
  isActive: boolean;
  // Selected suppliers: [{ supplierId, agreementId, includedPrice }]
  suppliers: { supplierId: string; agreementId: string; includedPrice: number }[];
};

export type PackageActionResult =
  | { success: true; packageId: string }
  | { success: false; error: string };

export async function createVenuePackage(
  input: CreatePackageInput
): Promise<PackageActionResult> {
  try {
    const { supabase, isAdmin, user, isVenueOwner, canManageAsCoordinator } =
      await requireVenueOwnerContext();

    const access = await assertCanWriteVenuePackage({
      supabase,
      userId: user.id,
      venueId: input.venueId,
      isAdmin,
      isVenueOwner,
      canManageAsCoordinator,
    });
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    // Insert the package
    const { data: pkg, error: pkgError } = await supabase
      .from("venue_packages")
      .insert({
        venue_id: input.venueId,
        name: input.name,
        description: input.description || null,
        event_type_id: input.eventTypeId || null,
        min_guests: input.minGuests,
        max_guests: input.maxGuests,
        price: input.price,
        price_unit: input.priceUnit,
        deposit_percentage: input.depositPercentage,
        deposit_flat_amount: input.depositFlatAmount,
        valid_from: input.validFrom || null,
        valid_until: input.validUntil || null,
        amenity_ids: input.amenityIds,
        venue_rules: input.venueRules || null,
        inclusions: input.inclusions,
        is_active: input.isActive,
      })
      .select("id")
      .single();

    if (pkgError || !pkg) {
      console.error("[createVenuePackage] pkg insert error:", pkgError?.message);
      return { success: false, error: pkgError?.message ?? "Failed to create package." };
    }

    const packageId = pkg.id as string;

    // Insert package_suppliers rows
    if (input.suppliers.length > 0) {
      const supplierRows = input.suppliers.map((s) => ({
        package_id: packageId,
        supplier_id: s.supplierId,
        agreement_id: s.agreementId || null,
        included_price: s.includedPrice,
      }));

      const { error: suppliersError } = await supabase
        .from("package_suppliers")
        .insert(supplierRows);

      if (suppliersError) {
        console.error(
          "[createVenuePackage] supplier insert error:",
          suppliersError.message
        );
        // Non-fatal: package was created; log but don't fail
      }
    }

    revalidatePath("/dashboard/packages");
    revalidatePath("/dashboard/coordinator/venues");
    return { success: true, packageId };
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      return { success: false, error: err.message };
    }
    console.error("[createVenuePackage] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function updateVenuePackage(
  packageId: string,
  input: CreatePackageInput
): Promise<PackageActionResult> {
  try {
    const { supabase, isAdmin, user, isVenueOwner, canManageAsCoordinator } =
      await requireVenueOwnerContext();

    const access = await assertCanWriteVenuePackage({
      supabase,
      userId: user.id,
      venueId: input.venueId,
      isAdmin,
      isVenueOwner,
      canManageAsCoordinator,
    });
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    // Ensure the package actually belongs to this venue
    const { data: pkgCheck } = await supabase
      .from("venue_packages")
      .select("venue_id")
      .eq("id", packageId)
      .maybeSingle();

    if (!pkgCheck || pkgCheck.venue_id !== input.venueId) {
      return { success: false, error: "Package not found or venue mismatch." };
    }

    // Update the package
    const { error: pkgError } = await supabase
      .from("venue_packages")
      .update({
        name: input.name,
        description: input.description || null,
        event_type_id: input.eventTypeId || null,
        min_guests: input.minGuests,
        max_guests: input.maxGuests,
        price: input.price,
        price_unit: input.priceUnit,
        deposit_percentage: input.depositPercentage,
        deposit_flat_amount: input.depositFlatAmount,
        valid_from: input.validFrom || null,
        valid_until: input.validUntil || null,
        amenity_ids: input.amenityIds,
        venue_rules: input.venueRules || null,
        inclusions: input.inclusions,
        is_active: input.isActive,
      })
      .eq("id", packageId);

    if (pkgError) {
      console.error("[updateVenuePackage] pkg update error:", pkgError.message);
      return { success: false, error: pkgError.message };
    }

    // Delete existing suppliers and re-insert
    await supabase.from("package_suppliers").delete().eq("package_id", packageId);

    if (input.suppliers.length > 0) {
      const supplierRows = input.suppliers.map((s) => ({
        package_id: packageId,
        supplier_id: s.supplierId,
        agreement_id: s.agreementId || null,
        included_price: s.includedPrice,
      }));

      const { error: suppliersError } = await supabase
        .from("package_suppliers")
        .insert(supplierRows);

      if (suppliersError) {
        console.error(
          "[updateVenuePackage] supplier insert error:",
          suppliersError.message
        );
      }
    }

    revalidatePath("/dashboard/packages");
    revalidatePath("/dashboard/coordinator/venues");
    return { success: true, packageId };
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      return { success: false, error: err.message };
    }
    console.error("[updateVenuePackage] unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}
