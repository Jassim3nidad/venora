"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ForbiddenError } from "@/src/lib/errors";

async function requireVenueOwnerOrAdmin() {
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

  const { data: memberRows } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  const isCoordinator = memberRows && memberRows.length > 0;

  if (!isAdmin && !isVenueOwner && !isCoordinator) {
    throw new ForbiddenError(
      "Only venue owners, admins, or coordinators can manage venue partnerships.",
    );
  }

  return { supabase, user, isAdmin, isVenueOwner, isCoordinator, roles };
}

async function requireSupplierContext() {
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

  if (!roles.includes("supplier")) {
    throw new ForbiddenError("Supplier access required.");
  }

  return { supabase, user };
}

async function getOwnerVenueIds(
  supabase: any,
  userId: string,
  isAdmin: boolean,
): Promise<string[]> {
  if (isAdmin) {
    const { data } = await supabase.from("venues").select("id");
    return (data ?? []).map((v: { id: string }) => v.id);
  }

  // Get orgs owned by the user
  const { data: owned } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId);
  const ownedOrgIds = (owned ?? []).map((o: { id: string }) => o.id);

  // Get orgs where user is an active member
  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active");
  const memberOrgIds = (members ?? []).map(
    (m: { organization_id: string }) => m.organization_id,
  );

  const allOrgIds = [...new Set([...ownedOrgIds, ...memberOrgIds])];
  if (allOrgIds.length === 0) return [];

  const { data } = await supabase
    .from("venues")
    .select("id")
    .in("organization_id", allOrgIds);
  return (data ?? []).map((v: { id: string }) => v.id);
}

/**
 * Link a supplier to one or more of the owner's venues.
 * Uses upsert with ignoreDuplicates so repeated invitations are safe.
 */
export async function inviteSupplierAsVenuePartner(
  supplierId: string,
  selectedVenueIds: string[],
  isPreferred = false,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!supplierId || selectedVenueIds.length === 0) {
    return { success: false, error: "Select at least one venue." };
  }

  try {
    const { supabase, user, isAdmin } = await requireVenueOwnerOrAdmin();

    // Validate that the requested venue IDs actually belong to this owner
    const ownerVenueIds = await getOwnerVenueIds(supabase, user.id, isAdmin);
    const validVenueIds = selectedVenueIds.filter((id) =>
      ownerVenueIds.includes(id),
    );

    if (validVenueIds.length === 0) {
      return {
        success: false,
        error: "None of the selected venues are yours.",
      };
    }

    // Validate supplier exists
    const { data: supplierCheck } = await supabase
      .from("supplier_profiles")
      .select("id")
      .eq("id", supplierId)
      .eq("accreditation_status", "accredited")
      .maybeSingle();

    if (!supplierCheck) {
      return {
        success: false,
        error: "Supplier not found or not yet accredited.",
      };
    }

    const { data: existingRows } = await supabase
      .from("venue_suppliers")
      .select("venue_id, status")
      .eq("supplier_id", supplierId)
      .in("venue_id", validVenueIds);

    const existingByVenue = new Map(
      (existingRows ?? []).map((row: { venue_id: string; status: string }) => [
        row.venue_id,
        row.status,
      ]),
    );

    const toInsert = validVenueIds.filter((id) => !existingByVenue.has(id));
    const toReinvite = validVenueIds.filter((id) => {
      const status = existingByVenue.get(id);
      return status === "declined" || status === "invited";
    });

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("venue_suppliers").insert(
        toInsert.map((venueId) => ({
          venue_id: venueId,
          supplier_id: supplierId,
          is_preferred: isPreferred,
          status: "invited",
          requested_by: user.id,
        })),
      );

      if (insertError) {
        console.error("[venue-partnership] insert error:", insertError.message);
        return {
          success: false,
          error: "Failed to save partnership. Please try again.",
        };
      }
    }

    for (const venueId of toReinvite) {
      const { error: updateError } = await supabase
        .from("venue_suppliers")
        .update({
          is_preferred: isPreferred,
          status: "invited",
          requested_by: user.id,
        })
        .eq("venue_id", venueId)
        .eq("supplier_id", supplierId);

      if (updateError) {
        console.error("[venue-partnership] update error:", updateError.message);
        return {
          success: false,
          error: "Failed to update partnership invite.",
        };
      }
    }

    // Keep preferred flag for already-active partners without downgrading status
    const alreadyActive = validVenueIds.filter(
      (id) => existingByVenue.get(id) === "active",
    );
    for (const venueId of alreadyActive) {
      await supabase
        .from("venue_suppliers")
        .update({ is_preferred: isPreferred })
        .eq("venue_id", venueId)
        .eq("supplier_id", supplierId);
    }

    revalidatePath("/dashboard/coordinator/suppliers");
    revalidatePath("/dashboard/venues");
    revalidatePath("/dashboard/supplier/partnerships");
    return { success: true };
  } catch (err: any) {
    console.error("[venue-partnership] error:", err?.message);
    return {
      success: false,
      error: err?.message ?? "An unexpected error occurred.",
    };
  }
}

export async function submitPartnershipRequest({
  venueId,
  supplierId,
  approvedServices,
  commercialTerms,
}: {
  venueId: string;
  supplierId: string;
  approvedServices: string[];
  commercialTerms: string;
}) {
  try {
    const { supabase, user } = await requireSupplierContext();

    // Verify supplier id matches current user
    const { data: supplierCheck } = await supabase
      .from("supplier_profiles")
      .select("id")
      .eq("profile_id", user.id)
      .eq("id", supplierId)
      .maybeSingle();

    if (!supplierCheck) {
      return { success: false, error: "Unauthorized." };
    }

    const { error } = await supabase.from("venue_suppliers").insert({
      venue_id: venueId,
      supplier_id: supplierId,
      status: "application_submitted",
      approved_services: approvedServices,
      commercial_terms: commercialTerms,
      requested_by: user.id,
    });

    if (error) {
      console.error(
        "[venue-partnership] error submitting request:",
        error.message,
      );
      return { success: false, error: "Failed to submit request." };
    }

    revalidatePath("/dashboard/supplier/partnerships");
    revalidatePath("/dashboard/supplier/venues");
    return { success: true };
  } catch (err: any) {
    console.error("[venue-partnership] error:", err?.message);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Remove a supplier from a specific venue.
 */
export async function removeSupplierFromVenue(
  supplierId: string,
  venueId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { supabase, user, isAdmin } = await requireVenueOwnerOrAdmin();

    const ownerVenueIds = await getOwnerVenueIds(supabase, user.id, isAdmin);
    if (!ownerVenueIds.includes(venueId)) {
      return { success: false, error: "You do not own this venue." };
    }

    const { error } = await supabase
      .from("venue_suppliers")
      .delete()
      .eq("venue_id", venueId)
      .eq("supplier_id", supplierId);

    if (error) {
      console.error("[venue-partnership] delete error:", error.message);
      return { success: false, error: "Failed to remove partnership." };
    }

    revalidatePath(`/dashboard/venues/${venueId}/suppliers`);
    revalidatePath("/dashboard/coordinator/suppliers");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message ?? "An unexpected error occurred.",
    };
  }
}

export async function updatePartnershipStatus(
  requestId: string,
  status: "active" | "declined",
) {
  try {
    const { supabase, user, isAdmin } = await requireVenueOwnerOrAdmin();

    // Validate that the request belongs to one of their venues
    const ownerVenueIds = await getOwnerVenueIds(supabase, user.id, isAdmin);

    const { data: request } = await supabase
      .from("venue_suppliers")
      .select("venue_id")
      .eq("id", requestId)
      .single();

    if (!request || !ownerVenueIds.includes(request.venue_id)) {
      return { success: false, error: "Unauthorized." };
    }

    const { error } = await supabase
      .from("venue_suppliers")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      console.error(
        "[venue-partnership] error updating status:",
        error.message,
      );
      return { success: false, error: "Failed to update request." };
    }

    revalidatePath("/dashboard/coordinator/suppliers");
    revalidatePath("/dashboard/coordinator/suppliers/requests");
    revalidatePath("/dashboard/supplier/partnerships");
    return { success: true };
  } catch (err: any) {
    console.error("[venue-partnership] error:", err?.message);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Supplier accepts or declines a venue-initiated partnership invite.
 */
export async function respondToPartnershipInvite(
  partnershipId: string,
  decision: "active" | "declined",
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { supabase, user } = await requireSupplierContext();

    const { data: supplier } = await supabase
      .from("supplier_profiles")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!supplier) {
      return { success: false, error: "Supplier profile not found." };
    }

    const { data: row } = await supabase
      .from("venue_suppliers")
      .select("id, status, supplier_id")
      .eq("id", partnershipId)
      .eq("supplier_id", supplier.id)
      .maybeSingle();

    if (!row) {
      return { success: false, error: "Invitation not found." };
    }

    if (row.status !== "invited") {
      return {
        success: false,
        error: "This invitation is no longer pending.",
      };
    }

    const { error } = await supabase
      .from("venue_suppliers")
      .update({ status: decision })
      .eq("id", partnershipId)
      .eq("supplier_id", supplier.id);

    if (error) {
      console.error(
        "[venue-partnership] invite respond error:",
        error.message,
      );
      return { success: false, error: "Failed to update invitation." };
    }

    revalidatePath("/dashboard/supplier/partnerships");
    revalidatePath("/dashboard/supplier/venues");
    revalidatePath("/dashboard/coordinator/suppliers");
    revalidatePath("/dashboard/coordinator/suppliers/requests");
    return { success: true };
  } catch (err: any) {
    console.error("[venue-partnership] invite respond error:", err?.message);
    return {
      success: false,
      error: err?.message ?? "An unexpected error occurred.",
    };
  }
}

/**
 * Returns which of the given venue IDs currently have this supplier linked.
 */
export async function getVenuePartnershipStatus(
  supplierId: string,
  venueIds: string[],
): Promise<string[]> {
  if (!supplierId || venueIds.length === 0) return [];
  try {
    const { supabase } = await requireVenueOwnerOrAdmin();
    const { data } = await supabase
      .from("venue_suppliers")
      .select("venue_id")
      .eq("supplier_id", supplierId)
      .in("venue_id", venueIds);
    return (data ?? []).map((row: { venue_id: string }) => row.venue_id);
  } catch {
    return [];
  }
}
