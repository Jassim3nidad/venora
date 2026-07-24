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
      "Only venue owners, admins, or coordinators can manage commercial agreements.",
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

export async function proposeCommercialAgreement({
  venueId,
  supplierId,
  serviceId,
  customServiceName,
  supplierBaseRate,
  venueMarkupFee,
  maxGuestCount,
  overtimeRate,
  travelFees,
  setupRequirements,
  cancellationTerms,
  reschedulingTerms,
  requiredLeadTimeDays,
}: {
  venueId: string;
  supplierId: string;
  serviceId?: string | undefined;
  customServiceName?: string | undefined;
  supplierBaseRate: number;
  venueMarkupFee: number;
  maxGuestCount?: number | undefined;
  overtimeRate?: number | undefined;
  travelFees?: number | undefined;
  setupRequirements?: string | undefined;
  cancellationTerms?: string | undefined;
  reschedulingTerms?: string | undefined;
  requiredLeadTimeDays?: number | undefined;
}) {
  try {
    const { supabase, user } = await requireVenueOwnerOrAdmin();

    // Ensure they have access to this venue
    const { data: venueAccess } = await supabase
      .from("venues")
      .select("id")
      .eq("id", venueId)
      .limit(1);

    if (!venueAccess || venueAccess.length === 0) {
      return { success: false, error: "Unauthorized access to venue." };
    }

    const { error } = await supabase.from("venue_supplier_agreements").insert({
      venue_id: venueId,
      supplier_id: supplierId,
      service_id: serviceId || null,
      custom_service_name: customServiceName || null,
      supplier_base_rate: supplierBaseRate,
      venue_markup_fee: venueMarkupFee,
      max_guest_count: maxGuestCount || null,
      overtime_rate: overtimeRate || null,
      travel_fees: travelFees || null,
      setup_requirements: setupRequirements || null,
      cancellation_terms: cancellationTerms || null,
      rescheduling_terms: reschedulingTerms || null,
      required_lead_time_days: requiredLeadTimeDays || null,
      status: "proposed",
      proposed_by: user.id,
    });

    if (error) {
      console.error("Propose agreement error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/coordinator/suppliers/${supplierId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "An unexpected error occurred." };
  }
}

export async function respondToAgreement({
  agreementId,
  status,
}: {
  agreementId: string;
  status: "active" | "rejected";
}) {
  try {
    const { supabase } = await requireSupplierContext();

    const { error } = await supabase
      .from("venue_supplier_agreements")
      .update({ status })
      .eq("id", agreementId)
      .eq("status", "proposed"); // Can only respond to proposed

    if (error) {
      console.error("Respond to agreement error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/supplier/partnerships`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "An unexpected error occurred." };
  }
}

export async function cancelAgreement({
  agreementId,
}: {
  agreementId: string;
}) {
  try {
    // Try supplier context first, fall back to venue owner/coordinator
    let supabase: any;

    try {
      const ctx = await requireSupplierContext();
      supabase = ctx.supabase;
    } catch {
      const ctx = await requireVenueOwnerOrAdmin();
      supabase = ctx.supabase;
    }

    // Fetch the agreement
    const { data: agreement, error: fetchError } = await supabase
      .from("venue_supplier_agreements")
      .select("id, venue_id, supplier_id, status, custom_service_name")
      .eq("id", agreementId)
      .eq("status", "active")
      .single();

    if (fetchError || !agreement) {
      return {
        success: false,
        error: "Agreement not found or already inactive.",
      };
    }

    // Guard: check for active or upcoming bookings at this venue
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("venue_id", agreement.venue_id)
      .in("status", ["pending", "approved", "confirmed", "payment_pending"])
      .limit(1);

    if (activeBookings && activeBookings.length > 0) {
      return {
        success: false,
        error:
          "Cannot cancel this agreement while there are active or upcoming bookings. Please resolve all pending bookings first.",
      };
    }

    // Expire the agreement
    const { error: updateError } = await supabase
      .from("venue_supplier_agreements")
      .update({ status: "expired" })
      .eq("id", agreementId)
      .eq("status", "active");

    if (updateError) {
      console.error("Cancel agreement error:", updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath(`/dashboard/coordinator/suppliers`);
    revalidatePath(`/dashboard/supplier/partnerships`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "An unexpected error occurred." };
  }
}
