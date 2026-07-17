"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getOwnerDashboardContext,
  getOwnerVenueById,
} from "@/lib/dashboard/org-dashboard-data";
import { ensureOwnerOrganizationMembership } from "@/features/organizations/application/ensure-owner-membership";

function newVenuePath(message: string) {
  return `/dashboard/venues/new?error=${encodeURIComponent(message)}`;
}

export async function ensureVenueOwnerMembershipAction(
  venueId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const context = await getOwnerDashboardContext();
  const venue = await getOwnerVenueById(
    context,
    venueId,
    "id, organization_id",
  );

  if (!venue?.organization_id) {
    return { success: false, error: "Venue not found." };
  }

  const result = await ensureOwnerOrganizationMembership(
    context,
    venue.organization_id,
  );

  return result.ok
    ? { success: true }
    : { success: false, error: result.error };
}

export async function createOrganizationAction(formData: FormData) {
  const context = await getOwnerDashboardContext();
  const { supabase, user, roles, isAdmin } = context;

  if (!isAdmin && !roles.includes("venue_owner")) {
    redirect("/unauthorized");
  }

  const name = String(formData.get("name") ?? "").trim();
  const businessRegistrationNo = String(
    formData.get("business_registration_no") ?? "",
  ).trim();

  if (!name) {
    redirect(newVenuePath("Please enter an organization name."));
  }

  if (name.length > 120) {
    redirect(
      newVenuePath("Organization name must be 120 characters or fewer."),
    );
  }

  if (businessRegistrationNo.length > 80) {
    redirect(
      newVenuePath(
        "Business registration number must be 80 characters or fewer.",
      ),
    );
  }

  const { data: organization, error } = await supabase
    .from("organizations")
    .insert({
      owner_id: user.id,
      name,
      business_registration_no: businessRegistrationNo || null,
    })
    .select("id")
    .single();

  if (error || !organization) {
    redirect(newVenuePath(error?.message || "Unable to create organization."));
  }

  const membership = await ensureOwnerOrganizationMembership(
    context,
    organization.id,
  );
  if (!membership.ok) {
    redirect(
      newVenuePath(
        membership.error || "Organization created but membership setup failed.",
      ),
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/venues");
  revalidatePath("/dashboard/venues/new");
  redirect("/dashboard/venues/new?org_created=1");
}
