import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DashButton,
  DashboardSubPage,
  Panel,
  PanelHeader,
} from "@/components/dashboard/enterprise";
import { createOrganizationAction } from "@/features/organizations/actions/organization.actions";
import { getOwnerDashboardContext } from "../../_lib/owner-dashboard-data";

export const metadata: Metadata = { title: "Add Venue - Dashboard" };

function fieldValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function optionalNumber(formData: FormData, name: string) {
  const value = fieldValue(formData, name);
  return value === "" ? null : Number(value);
}

function numberValue(formData: FormData, name: string) {
  return Number(fieldValue(formData, name));
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "venue";
}

function newVenuePath(message: string) {
  return `/dashboard/venues/new?error=${encodeURIComponent(message)}`;
}

export default async function NewVenuePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; org_created?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const context = await getOwnerDashboardContext();
  const { supabase, orgIds, roles, isAdmin } = context;

  if (!isAdmin && !roles.includes("venue_owner")) {
    redirect("/unauthorized");
  }

  const { data: organizations } = isAdmin
    ? await supabase
      .from("organizations")
      .select("id, name")
      .order("name", { ascending: true })
    : orgIds.length > 0
      ? await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds)
        .order("name", { ascending: true })
      : { data: [] };

  const orgRows = (organizations ?? []) as Array<{ id: string; name: string }>;

  async function createVenueAction(formData: FormData) {
    "use server";

    const actionContext = await getOwnerDashboardContext();
    const {
      supabase: actionSupabase,
      orgIds: actionOrgIds,
      roles: actionRoles,
      isAdmin: actionIsAdmin,
    } = actionContext;

    if (!actionIsAdmin && !actionRoles.includes("venue_owner")) {
      redirect("/unauthorized");
    }

    const organizationId = fieldValue(formData, "organization_id");
    if (!organizationId) {
      redirect(newVenuePath("Please choose an organization."));
    }

    if (!actionIsAdmin && !actionOrgIds.includes(organizationId)) {
      redirect("/unauthorized");
    }

    const name = fieldValue(formData, "name");
    const province = fieldValue(formData, "province");
    const city = fieldValue(formData, "city");
    const address = fieldValue(formData, "address");
    const indoorOutdoor = fieldValue(formData, "indoor_outdoor") || "indoor";
    const basePrice = numberValue(formData, "base_price");
    const capacityMax = numberValue(formData, "capacity_max");
    const capacityMin = optionalNumber(formData, "capacity_min");

    if (!name || !province || !city || !address) {
      redirect(newVenuePath("Please complete all required fields."));
    }

    if (!["indoor", "outdoor", "both"].includes(indoorOutdoor)) {
      redirect(newVenuePath("Please choose a valid venue setting."));
    }

    if (
      Number.isNaN(basePrice) ||
      Number.isNaN(capacityMax) ||
      (capacityMin != null && Number.isNaN(capacityMin))
    ) {
      redirect(newVenuePath("Please enter valid numbers."));
    }

    if (
      basePrice < 0 ||
      capacityMax < 1 ||
      (capacityMin != null && capacityMin < 0)
    ) {
      redirect(newVenuePath("Price and capacity values must be positive."));
    }

    if (capacityMin != null && capacityMin > capacityMax) {
      redirect(
        newVenuePath("Minimum capacity must not exceed maximum capacity."),
      );
    }

    const baseSlug = slugify(name);
    const { data: existingSlug } = await actionSupabase
      .from("venues")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();
    const slug = existingSlug
      ? `${baseSlug}-${Date.now().toString(36)}`
      : baseSlug;

    const { data: createdVenue, error } = await actionSupabase
      .from("venues")
      .insert({
        organization_id: organizationId,
        name,
        slug,
        description: fieldValue(formData, "description") || null,
        ai_generated_description: null,
        province,
        city,
        municipality: fieldValue(formData, "municipality") || null,
        address,
        latitude: null,
        longitude: null,
        capacity_min: capacityMin,
        capacity_max: capacityMax,
        base_price: basePrice,
        price_unit: "per_event",
        indoor_outdoor: indoorOutdoor,
        air_conditioned: false,
        parking_available: false,
        overnight_accommodation: false,
        pet_friendly: false,
        wheelchair_accessible: false,
        has_pool: false,
        ceremony_venue: false,
        reception_venue: true,
        operating_hours: null,
        cancellation_policy: null,
        venue_rules: null,
        status: "pending_approval",
        is_featured: false,
        featured_until: null,
      })
      .select("id")
      .single();

    if (error || !createdVenue) {
      redirect(newVenuePath(error?.message || "Unable to create venue."));
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/venues");
    revalidatePath("/venues");
    redirect(`/dashboard/venues/${createdVenue.id}/edit?created=1`);
  }

  const inputClass =
    "h-12 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]";
  const textareaClass =
    "rounded-2xl border border-[#dbe3ef] bg-white px-4 py-3 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]";
  const labelClass = "text-sm font-bold text-[#334155]";

  return (
    <DashboardSubPage
      title={orgRows.length === 0 ? "Create Organization" : "Add Venue"}
      description={
        orgRows.length === 0
          ? "Set up your business organization before adding venues."
          : "Create a new venue listing for your organization. New listings enter admin approval before going public."
      }
      action={
        <DashButton
          href="/dashboard/venues"
          variant="secondary"
          icon="arrow_back"
        >
          Back to Venues
        </DashButton>
      }
    >
      {orgRows.length === 0 ? (
        <Panel className="overflow-hidden" padding={false}>
          <div className="border-b border-[#e5e7eb] bg-[#f8fbff] p-5 sm:p-6">
            <PanelHeader
              title="Create your organization"
              description="Venues belong to an organization (your business or venue group). Create one to continue."
            />
          </div>

          {query.error ? (
            <div className="mx-5 mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:mx-6">
              {query.error}
            </div>
          ) : null}

          <form
            action={createOrganizationAction}
            className="space-y-5 p-5 sm:p-6"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="org-name" className={labelClass}>
                Organization name
              </label>
              <input
                id="org-name"
                name="name"
                required
                maxLength={120}
                placeholder="e.g. Santos Events Co."
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="org-registration" className={labelClass}>
                Business registration no.{" "}
                <span className="font-medium text-[#94a3b8]">(optional)</span>
              </label>
              <input
                id="org-registration"
                name="business_registration_no"
                maxLength={80}
                placeholder="DTI / SEC / business permit number"
                className={inputClass}
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <DashButton type="submit" icon="add_business">
                Create organization
              </DashButton>
              <DashButton
                href="/dashboard/venues"
                variant="secondary"
                icon="arrow_back"
              >
                Cancel
              </DashButton>
            </div>
          </form>
        </Panel>
      ) : (
        <Panel className="overflow-hidden" padding={false}>
          <div className="border-b border-[#e5e7eb] bg-[#f8fbff] p-5 sm:p-6">
            <PanelHeader
              title="Venue Details"
              description="Start with the core information. You can add photos after the venue record is created."
            />
          </div>

          {query.org_created ? (
            <div className="mx-5 mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 sm:mx-6">
              Organization created. You can add your first venue below.
            </div>
          ) : null}

          {query.error ? (
            <div className="mx-5 mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:mx-6">
              {query.error}
            </div>
          ) : null}

          <form action={createVenueAction} className="space-y-6 p-5 sm:p-6">
            <div className="rounded-[24px] border border-[#e5e7eb] bg-white p-4 sm:p-5">
              <h2 className="font-display text-base font-black text-[#0f172a]">
                Basic Information
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Name the venue and connect it to the right organization.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label
                    htmlFor="new-venue-organization"
                    className={labelClass}
                  >
                    Organization
                  </label>
                  <div className="relative">
                    <select
                      id="new-venue-organization"
                      name="organization_id"
                      required
                      defaultValue={orgRows[0]?.id}
                      className={`${inputClass} w-full appearance-none pr-10`}
                    >
                      {orgRows.map((organization) => (
                        <option key={organization.id} value={organization.id}>
                          {organization.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#94a3b8]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="new-venue-name" className={labelClass}>
                    Venue name
                  </label>
                  <input
                    id="new-venue-name"
                    name="name"
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#e5e7eb] bg-[#f8fafc] p-4 sm:p-5">
              <h2 className="font-display text-base font-black text-[#0f172a]">
                Location & Capacity
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Add the location, guest range, and base event pricing.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="new-venue-province" className={labelClass}>
                    Province
                  </label>
                  <input
                    id="new-venue-province"
                    name="province"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="new-venue-city" className={labelClass}>
                    City
                  </label>
                  <input
                    id="new-venue-city"
                    name="city"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="new-venue-municipality"
                    className={labelClass}
                  >
                    Municipality
                  </label>
                  <input
                    id="new-venue-municipality"
                    name="municipality"
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="new-venue-setting" className={labelClass}>
                    Venue setting
                  </label>
                  <div className="relative">
                    <select
                      id="new-venue-setting"
                      name="indoor_outdoor"
                      defaultValue="indoor"
                      className={`${inputClass} w-full appearance-none pr-10`}
                    >
                      <option value="indoor">Indoor</option>
                      <option value="outdoor">Outdoor</option>
                      <option value="both">Indoor and outdoor</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#94a3b8]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="new-venue-price" className={labelClass}>
                    Base price
                  </label>
                  <input
                    id="new-venue-price"
                    type="number"
                    min="0"
                    step="1"
                    name="base_price"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="new-venue-capacity-min"
                    className={labelClass}
                  >
                    Min capacity
                  </label>
                  <input
                    id="new-venue-capacity-min"
                    type="number"
                    min="0"
                    step="1"
                    name="capacity_min"
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="new-venue-capacity-max"
                    className={labelClass}
                  >
                    Max capacity
                  </label>
                  <input
                    id="new-venue-capacity-max"
                    type="number"
                    min="1"
                    step="1"
                    name="capacity_max"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="new-venue-address" className={labelClass}>
                    Address
                  </label>
                  <input
                    id="new-venue-address"
                    name="address"
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#e5e7eb] bg-white p-4 sm:p-5">
              <h2 className="font-display text-base font-black text-[#0f172a]">
                Public Description
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                A short summary helps customers understand the venue before
                photos are added.
              </p>
              <div className="mt-4 grid gap-4">
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="new-venue-description" className={labelClass}>
                    Description
                  </label>
                  <textarea
                    id="new-venue-description"
                    name="description"
                    rows={6}
                    className={textareaClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#e5e7eb] pt-5 sm:flex-row sm:justify-end">
              <DashButton href="/dashboard/venues" variant="secondary">
                Cancel
              </DashButton>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-200/70 transition hover:bg-[#1e40af] focus:outline-none focus:ring-4 focus:ring-[#dbeafe]"
              >
                Create Venue
              </button>
            </div>
          </form>
        </Panel>
      )}
    </DashboardSubPage>
  );
}
