import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  DashButton,
  DashboardSubPage,
  Panel,
  PanelHeader,
} from "@/components/dashboard/enterprise";
import VenuePhotoUpload from "@/components/venues/VenuePhotoUpload";
import DescriptionGeneratorPanel from "@/features/venues/ui/DescriptionGeneratorPanel";
import { getLatestGeneratedContentByType } from "@/features/venues/application/queries";
import {
  getOwnerDashboardContext,
  getOwnerVenueById,
} from "../../../_lib/owner-dashboard-data";

export const metadata: Metadata = { title: "Edit Venue" };

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

function editVenuePath(id: string, params?: string) {
  return `/dashboard/venues/${id}/edit${params ? `?${params}` : ""}`;
}

export default async function EditVenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ saved?: string; created?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const context = await getOwnerDashboardContext();
  const venue = await getOwnerVenueById(context, id);

  if (!venue) notFound();

  const [initialDrafts, packagesResult] = await Promise.all([
    getLatestGeneratedContentByType(context.supabase, id),
    context.supabase
      .from("venue_packages")
      .select("id, name")
      .eq("venue_id", id)
      .eq("is_active", true),
  ]);
  const venuePackageOptions = (packagesResult.data ?? []) as { id: string; name: string }[];

  async function updateVenueAction(formData: FormData) {
    "use server";

    const actionContext = await getOwnerDashboardContext();
    const existingVenue = await getOwnerVenueById(actionContext, id, "id, slug");
    if (!existingVenue) notFound();

    const name = fieldValue(formData, "name");
    const province = fieldValue(formData, "province");
    const city = fieldValue(formData, "city");
    const address = fieldValue(formData, "address");
    const basePrice = numberValue(formData, "base_price");
    const capacityMax = numberValue(formData, "capacity_max");
    const capacityMin = optionalNumber(formData, "capacity_min");
    const latitude = optionalNumber(formData, "latitude");
    const longitude = optionalNumber(formData, "longitude");

    if (!name || !province || !city || !address) {
      redirect(editVenuePath(id, "error=Please%20complete%20all%20required%20fields."));
    }

    if (
      Number.isNaN(basePrice) ||
      Number.isNaN(capacityMax) ||
      (capacityMin != null && Number.isNaN(capacityMin)) ||
      (latitude != null && Number.isNaN(latitude)) ||
      (longitude != null && Number.isNaN(longitude))
    ) {
      redirect(editVenuePath(id, "error=Please%20enter%20valid%20numbers."));
    }

    if (capacityMin != null && capacityMin > capacityMax) {
      redirect(editVenuePath(id, "error=Minimum%20capacity%20must%20not%20exceed%20maximum%20capacity."));
    }

    if (
      (latitude != null && (latitude < -90 || latitude > 90)) ||
      (longitude != null && (longitude < -180 || longitude > 180))
    ) {
      redirect(editVenuePath(id, "error=Please%20enter%20valid%20map%20coordinates."));
    }

    const { error } = await actionContext.supabase
      .from("venues")
      .update({
        name,
        province,
        city,
        municipality: fieldValue(formData, "municipality") || null,
        address,
        description: fieldValue(formData, "description") || null,
        base_price: basePrice,
        capacity_min: capacityMin,
        capacity_max: capacityMax,
        latitude,
        longitude,
      })
      .eq("id", id);

    if (error) {
      redirect(
        editVenuePath(
          id,
          `error=${encodeURIComponent(error.message || "Unable to save venue changes.")}`,
        ),
      );
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/venue-owner");
    revalidatePath("/dashboard/venues");
    revalidatePath(editVenuePath(id));
    revalidatePath("/venues");
    if (existingVenue.slug) {
      revalidatePath(`/venues/${existingVenue.slug}`);
      revalidatePath(`/venues/${existingVenue.slug}/book`);
    }
    redirect(editVenuePath(id, "saved=1"));
  }

  const inputClass =
    "h-11 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]";
  const labelClass = "text-sm font-semibold text-[#374151]";

  return (
    <DashboardSubPage
      title="Edit Venue"
      description="Update core venue details, pricing, guest capacity, and media for this listing."
      action={
        <DashButton href="/dashboard/venues" variant="secondary" icon="arrow_back">
          Back to Venues
        </DashButton>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel>
          <PanelHeader
            title={venue.name}
            description="Changes here update the venue profile used throughout the marketplace and owner dashboard."
          />

          {query.created ? (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Venue created. It is pending admin approval before appearing publicly.
            </div>
          ) : query.saved ? (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Venue changes saved.
            </div>
          ) : null}
          {query.error ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {query.error}
            </div>
          ) : null}

          <form action={updateVenueAction} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label htmlFor="edit-venue-name" className={labelClass}>
                  Venue name
                </label>
                <input
                  id="edit-venue-name"
                  name="name"
                  required
                  defaultValue={venue.name}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="edit-venue-province" className={labelClass}>
                  Province
                </label>
                <input
                  id="edit-venue-province"
                  name="province"
                  required
                  defaultValue={venue.province}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="edit-venue-city" className={labelClass}>
                  City
                </label>
                <input
                  id="edit-venue-city"
                  name="city"
                  required
                  defaultValue={venue.city}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="edit-venue-municipality" className={labelClass}>
                  Municipality
                </label>
                <input
                  id="edit-venue-municipality"
                  name="municipality"
                  defaultValue={venue.municipality ?? ""}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="edit-venue-price" className={labelClass}>
                  Base price
                </label>
                <input
                  id="edit-venue-price"
                  type="number"
                  min="0"
                  step="1"
                  name="base_price"
                  required
                  defaultValue={venue.base_price}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="edit-venue-capacity-min" className={labelClass}>
                  Min capacity
                </label>
                <input
                  id="edit-venue-capacity-min"
                  type="number"
                  min="0"
                  step="1"
                  name="capacity_min"
                  defaultValue={venue.capacity_min ?? ""}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="edit-venue-capacity-max" className={labelClass}>
                  Max capacity
                </label>
                <input
                  id="edit-venue-capacity-max"
                  type="number"
                  min="1"
                  step="1"
                  name="capacity_max"
                  required
                  defaultValue={venue.capacity_max}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <label htmlFor="edit-venue-address" className={labelClass}>
                  Address
                </label>
                <input
                  id="edit-venue-address"
                  name="address"
                  required
                  defaultValue={venue.address}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="edit-venue-latitude" className={labelClass}>
                  Map latitude
                </label>
                <input
                  id="edit-venue-latitude"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  name="latitude"
                  defaultValue={venue.latitude ?? ""}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="edit-venue-longitude" className={labelClass}>
                  Map longitude
                </label>
                <input
                  id="edit-venue-longitude"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  name="longitude"
                  defaultValue={venue.longitude ?? ""}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <label htmlFor="edit-venue-description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="edit-venue-description"
                  name="description"
                  rows={6}
                  defaultValue={venue.description ?? ""}
                  className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#e5e7eb] pt-5 sm:flex-row sm:justify-end">
              <DashButton href="/dashboard/venues" variant="secondary">
                Cancel
              </DashButton>
              <button
                id="edit-venue-save-btn"
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1e40af]"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Panel>

        <div className="space-y-6">
          <VenuePhotoUpload venueId={venue.id} organizationId={venue.organization_id} />
          <DescriptionGeneratorPanel
            venueId={venue.id}
            currentDescription={venue.description ?? null}
            packages={venuePackageOptions}
            initialDrafts={initialDrafts}
          />
        </div>
      </div>
    </DashboardSubPage>
  );
}
