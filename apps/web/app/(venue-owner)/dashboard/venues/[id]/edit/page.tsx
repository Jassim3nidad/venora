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
import VenueVideoUpload from "@/components/venues/VenueVideoUpload";
import DescriptionGeneratorPanel from "@/features/venues/ui/DescriptionGeneratorPanel";
import { getLatestGeneratedContentByType } from "@/features/venues/application/queries";
import {
  getOwnerDashboardContext,
  getOwnerVenueById,
} from "../../../_lib/owner-dashboard-data";
import { resolveVenueMapCoordinates } from "@/src/lib/venue-map-coordinates";
import VenueLocationPicker from "@/src/features/venues/ui/VenueLocationPicker";

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

const PRICE_UNITS = ["per_event", "per_pax", "per_hour", "per_day"] as const;

function booleanValue(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function lineListValue(formData: FormData, name: string) {
  return Array.from(
    new Set(
      fieldValue(formData, name)
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function textFromLines(values: string[] | null | undefined) {
  return (values ?? []).join("\n");
}

function numberOrNullFromValue(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw === "" ? null : Number(raw);
}

function validPriceUnit(value: string) {
  return PRICE_UNITS.includes(value as (typeof PRICE_UNITS)[number])
    ? (value as (typeof PRICE_UNITS)[number])
    : "per_event";
}

function errorRedirect(id: string, message: string): never {
  redirect(editVenuePath(id, `error=${encodeURIComponent(message)}`));
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

  const [initialDrafts, packagesResult, amenitiesResult, venueAmenitiesResult] =
    await Promise.all([
      getLatestGeneratedContentByType(context.supabase, id),
      context.supabase
        .from("venue_packages")
        .select("*")
        .eq("venue_id", id)
        .order("created_at", { ascending: true }),
      context.supabase.from("amenities").select("id, name").order("name"),
      context.supabase
        .from("venue_amenities")
        .select("amenity_id")
        .eq("venue_id", id),
    ]);
  const packages = (packagesResult.data ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    price_unit: string;
    min_guests: number | null;
    max_guests: number | null;
    inclusions: string[];
    is_active: boolean;
  }>;
  const venuePackageOptions = packages
    .filter((pkg) => pkg.is_active)
    .map((pkg) => ({ id: pkg.id, name: pkg.name }));
  const amenities = (amenitiesResult.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const selectedAmenityIds = new Set(
    ((venueAmenitiesResult.data ?? []) as Array<{ amenity_id: string }>).map(
      (item) => item.amenity_id,
    ),
  );

  async function updateVenueAction(formData: FormData) {
    "use server";

    const actionContext = await getOwnerDashboardContext();
    const existingVenue = await getOwnerVenueById(
      actionContext,
      id,
      "id, slug",
    );
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
    const priceUnit = validPriceUnit(fieldValue(formData, "price_unit"));
    const indoorOutdoor = fieldValue(formData, "indoor_outdoor") || "indoor";
    const rules = lineListValue(formData, "venue_rules");
    const cancellationPolicy =
      fieldValue(formData, "cancellation_policy") || null;

    if (!name || !province || !city || !address) {
      errorRedirect(id, "Please complete all required fields.");
    }

    if (!["indoor", "outdoor", "both"].includes(indoorOutdoor)) {
      errorRedirect(id, "Please choose a valid venue setting.");
    }

    if (
      Number.isNaN(basePrice) ||
      Number.isNaN(capacityMax) ||
      (capacityMin != null && Number.isNaN(capacityMin)) ||
      (latitude != null && Number.isNaN(latitude)) ||
      (longitude != null && Number.isNaN(longitude))
    ) {
      errorRedirect(id, "Please enter valid numbers.");
    }

    if (
      basePrice <= 0 ||
      capacityMax < 1 ||
      (capacityMin != null && capacityMin < 0)
    ) {
      errorRedirect(
        id,
        "Base price and maximum capacity must be greater than zero.",
      );
    }

    if ((latitude == null) !== (longitude == null)) {
      errorRedirect(
        id,
        "Please set both latitude and longitude for the map point.",
      );
    }

    if (capacityMin != null && capacityMin > capacityMax) {
      errorRedirect(id, "Minimum capacity must not exceed maximum capacity.");
    }

    if (
      (latitude != null && (latitude < -90 || latitude > 90)) ||
      (longitude != null && (longitude < -180 || longitude > 180))
    ) {
      errorRedirect(id, "Please enter valid map coordinates.");
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
        price_unit: priceUnit,
        capacity_min: capacityMin,
        capacity_max: capacityMax,
        indoor_outdoor: indoorOutdoor,
        air_conditioned: booleanValue(formData, "air_conditioned"),
        parking_available: booleanValue(formData, "parking_available"),
        overnight_accommodation: booleanValue(
          formData,
          "overnight_accommodation",
        ),
        pet_friendly: booleanValue(formData, "pet_friendly"),
        wheelchair_accessible: booleanValue(formData, "wheelchair_accessible"),
        has_pool: booleanValue(formData, "has_pool"),
        ceremony_venue: booleanValue(formData, "ceremony_venue"),
        reception_venue: booleanValue(formData, "reception_venue"),
        cancellation_policy: cancellationPolicy,
        venue_rules: rules.length > 0 ? rules.join("\n") : null,
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

    const selectedAmenityIds = Array.from(
      new Set(formData.getAll("amenity_ids").map((value) => String(value))),
    );

    const { error: deleteAmenitiesError } = await actionContext.supabase
      .from("venue_amenities")
      .delete()
      .eq("venue_id", id);

    if (deleteAmenitiesError) {
      errorRedirect(
        id,
        deleteAmenitiesError.message || "Unable to update amenities.",
      );
    }

    if (selectedAmenityIds.length > 0) {
      const { error: insertAmenitiesError } = await actionContext.supabase
        .from("venue_amenities")
        .insert(
          selectedAmenityIds.map((amenityId) => ({
            venue_id: id,
            amenity_id: amenityId,
          })),
        );

      if (insertAmenitiesError) {
        errorRedirect(
          id,
          insertAmenitiesError.message || "Unable to update amenities.",
        );
      }
    }

    const packageIds = formData
      .getAll("package_id")
      .map((value) => String(value));
    for (const packageId of packageIds) {
      const packageName = fieldValue(formData, `package_${packageId}_name`);
      const packageDescription =
        fieldValue(formData, `package_${packageId}_description`) || null;
      const packagePrice = Number(
        fieldValue(formData, `package_${packageId}_price`),
      );
      const packagePriceUnit = validPriceUnit(
        fieldValue(formData, `package_${packageId}_price_unit`),
      );
      const packageMinGuests = numberOrNullFromValue(
        formData.get(`package_${packageId}_min_guests`),
      );
      const packageMaxGuests = numberOrNullFromValue(
        formData.get(`package_${packageId}_max_guests`),
      );
      const packageInclusions = lineListValue(
        formData,
        `package_${packageId}_inclusions`,
      );
      const shouldDeactivate =
        formData.get(`package_${packageId}_delete`) === "on";

      if (!packageName) errorRedirect(id, "Package name is required.");
      if (Number.isNaN(packagePrice) || packagePrice < 0) {
        errorRedirect(id, "Package price must be zero or positive.");
      }
      if (
        (packageMinGuests != null && Number.isNaN(packageMinGuests)) ||
        (packageMaxGuests != null && Number.isNaN(packageMaxGuests))
      ) {
        errorRedirect(id, "Package guest counts must be valid numbers.");
      }
      if (
        packageMinGuests != null &&
        packageMaxGuests != null &&
        packageMinGuests > packageMaxGuests
      ) {
        errorRedirect(
          id,
          "Package minimum guests cannot exceed maximum guests.",
        );
      }
      if (packageMaxGuests != null && packageMaxGuests > capacityMax) {
        errorRedirect(
          id,
          "Package maximum guests cannot exceed venue capacity.",
        );
      }

      const { error: packageError } = await actionContext.supabase
        .from("venue_packages")
        .update({
          name: packageName,
          description: packageDescription,
          price: packagePrice,
          price_unit: packagePriceUnit,
          min_guests: packageMinGuests,
          max_guests: packageMaxGuests,
          inclusions: packageInclusions,
          is_active: shouldDeactivate
            ? false
            : booleanValue(formData, `package_${packageId}_is_active`),
        })
        .eq("id", packageId)
        .eq("venue_id", id);

      if (packageError) {
        errorRedirect(id, packageError.message || "Unable to update package.");
      }
    }

    const newPackageName = fieldValue(formData, "new_package_name");
    const newPackagePriceRaw = fieldValue(formData, "new_package_price");
    if (newPackageName || newPackagePriceRaw) {
      const newPackagePrice = Number(newPackagePriceRaw);
      const newPackageMinGuests = optionalNumber(
        formData,
        "new_package_min_guests",
      );
      const newPackageMaxGuests = optionalNumber(
        formData,
        "new_package_max_guests",
      );

      if (!newPackageName) errorRedirect(id, "New package name is required.");
      if (Number.isNaN(newPackagePrice) || newPackagePrice < 0) {
        errorRedirect(id, "New package price must be zero or positive.");
      }
      if (
        (newPackageMinGuests != null && Number.isNaN(newPackageMinGuests)) ||
        (newPackageMaxGuests != null && Number.isNaN(newPackageMaxGuests))
      ) {
        errorRedirect(id, "New package guest counts must be valid numbers.");
      }
      if (
        newPackageMinGuests != null &&
        newPackageMaxGuests != null &&
        newPackageMinGuests > newPackageMaxGuests
      ) {
        errorRedirect(
          id,
          "New package minimum guests cannot exceed maximum guests.",
        );
      }
      if (newPackageMaxGuests != null && newPackageMaxGuests > capacityMax) {
        errorRedirect(
          id,
          "New package maximum guests cannot exceed venue capacity.",
        );
      }

      const { error: newPackageError } = await actionContext.supabase
        .from("venue_packages")
        .insert({
          venue_id: id,
          name: newPackageName,
          description: fieldValue(formData, "new_package_description") || null,
          price: newPackagePrice,
          price_unit: validPriceUnit(
            fieldValue(formData, "new_package_price_unit"),
          ),
          min_guests: newPackageMinGuests,
          max_guests: newPackageMaxGuests,
          inclusions: lineListValue(formData, "new_package_inclusions"),
          is_active: booleanValue(formData, "new_package_is_active"),
        });

      if (newPackageError) {
        errorRedirect(
          id,
          newPackageError.message || "Unable to create package.",
        );
      }
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
  const topInputClass =
    "h-12 rounded-2xl border border-[#e5e7eb] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]";
  const topTextareaClass =
    "rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]";
  const topLabelClass = "text-sm font-bold text-[#374151]";
  const fallbackMapLocation = await resolveVenueMapCoordinates(venue);

  return (
    <DashboardSubPage
      title="Edit Venue"
      description="Update core venue details, pricing, guest capacity, and media for this listing."
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel
          padding={false}
          className="overflow-hidden rounded-[8px] border-[#e5e7eb] shadow-lg shadow-slate-200/70"
        >
          <div className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-black tracking-tight text-[#020617]">
                {venue.name}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#4b5563]">
                Changes here update the venue profile used throughout the
                marketplace and owner dashboard.
              </p>
            </div>

            {query.created ? (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Venue created. It is pending admin approval before appearing
                publicly.
              </div>
            ) : query.saved ? (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Venue changes saved.
              </div>
            ) : null}
            {query.error ? (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {query.error}
              </div>
            ) : null}

            <form action={updateVenueAction} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="edit-venue-name" className={topLabelClass}>
                    Venue name
                  </label>
                  <input
                    id="edit-venue-name"
                    name="name"
                    required
                    defaultValue={venue.name}
                    className={topInputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="edit-venue-province"
                    className={topLabelClass}
                  >
                    Province
                  </label>
                  <input
                    id="edit-venue-province"
                    name="province"
                    required
                    defaultValue={venue.province}
                    className={topInputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="edit-venue-city" className={topLabelClass}>
                    City
                  </label>
                  <input
                    id="edit-venue-city"
                    name="city"
                    required
                    defaultValue={venue.city}
                    className={topInputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="edit-venue-municipality"
                    className={topLabelClass}
                  >
                    Municipality
                  </label>
                  <input
                    id="edit-venue-municipality"
                    name="municipality"
                    defaultValue={venue.municipality ?? ""}
                    className={topInputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="edit-venue-price" className={topLabelClass}>
                    Base price
                  </label>
                  <input
                    id="edit-venue-price"
                    type="number"
                    min="1"
                    step="1"
                    name="base_price"
                    required
                    defaultValue={venue.base_price}
                    className={topInputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="edit-venue-price-unit"
                    className={topLabelClass}
                  >
                    Base price unit
                  </label>
                  <select
                    id="edit-venue-price-unit"
                    name="price_unit"
                    defaultValue={venue.price_unit}
                    className={topInputClass}
                  >
                    <option value="per_event">Per event</option>
                    <option value="per_pax">Per guest</option>
                    <option value="per_hour">Per hour</option>
                    <option value="per_day">Per day</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="edit-venue-capacity-min"
                    className={topLabelClass}
                  >
                    Min capacity
                  </label>
                  <input
                    id="edit-venue-capacity-min"
                    type="number"
                    min="0"
                    step="1"
                    name="capacity_min"
                    defaultValue={venue.capacity_min ?? ""}
                    className={topInputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="edit-venue-capacity-max"
                    className={topLabelClass}
                  >
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
                    className={topInputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="edit-venue-setting" className={topLabelClass}>
                    Venue setting
                  </label>
                  <select
                    id="edit-venue-setting"
                    name="indoor_outdoor"
                    defaultValue={venue.indoor_outdoor}
                    className={topInputClass}
                  >
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="both">Indoor and outdoor</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="edit-venue-address" className={topLabelClass}>
                    Address
                  </label>
                  <input
                    id="edit-venue-address"
                    name="address"
                    required
                    defaultValue={venue.address}
                    className={topInputClass}
                  />
                </div>

                <VenueLocationPicker
                  initialLatitude={venue.latitude}
                  initialLongitude={venue.longitude}
                  fallbackLatitude={fallbackMapLocation?.latitude ?? null}
                  fallbackLongitude={fallbackMapLocation?.longitude ?? null}
                />

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label
                    htmlFor="edit-venue-description"
                    className={topLabelClass}
                  >
                    Description
                  </label>
                  <textarea
                    id="edit-venue-description"
                    name="description"
                    rows={6}
                    defaultValue={venue.description ?? ""}
                    className={topTextareaClass}
                  />
                </div>
              </div>

              <section className="rounded-[24px] border border-[#e5e7eb] bg-[#f8fbff] p-5">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#2563eb]">
                    Amenities & Features
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#0f172a]">
                    Select what this venue offers
                  </h3>
                  <p className="mt-1 text-sm font-medium text-[#64748b]">
                    These amenities appear on the public venue details page and
                    help customers filter listings.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {amenities.map((amenity) => (
                    <label
                      key={amenity.id}
                      className="flex items-center gap-3 rounded-2xl border border-[#dbe3ef] bg-white px-3 py-3 text-sm font-semibold text-[#334155] shadow-sm shadow-slate-200/50"
                    >
                      <input
                        type="checkbox"
                        name="amenity_ids"
                        value={amenity.id}
                        defaultChecked={selectedAmenityIds.has(amenity.id)}
                        className="h-4 w-4 rounded border-[#d1d5db] text-[#2563eb]"
                      />
                      <span>{amenity.name}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#2563eb]">
                    Packages & Pricing
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#0f172a]">
                    Manage active customer packages
                  </h3>
                  <p className="mt-1 text-sm font-medium text-[#64748b]">
                    Inactive packages stay in the dashboard but are hidden from
                    customers and booking selection.
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  {packages.length > 0 ? (
                    packages.map((pkg, index) => (
                      <div
                        key={pkg.id}
                        className="rounded-[22px] border border-[#e5e7eb] bg-[#f8fbff] p-4 shadow-sm shadow-slate-200/60"
                      >
                        <input type="hidden" name="package_id" value={pkg.id} />
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-black text-[#111827]">
                            Package {index + 1}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs font-bold text-[#6b7280]">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                name={`package_${pkg.id}_is_active`}
                                defaultChecked={pkg.is_active}
                                className="h-4 w-4 rounded border-[#d1d5db] text-[#2563eb]"
                              />
                              Active
                            </label>
                            <label className="inline-flex items-center gap-2 text-red-600">
                              <input
                                type="checkbox"
                                name={`package_${pkg.id}_delete`}
                                className="h-4 w-4 rounded border-red-300 text-red-600"
                              />
                              Deactivate
                            </label>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-2">
                            <label
                              className={labelClass}
                              htmlFor={`package-${pkg.id}-name`}
                            >
                              Package name
                            </label>
                            <input
                              id={`package-${pkg.id}-name`}
                              name={`package_${pkg.id}_name`}
                              defaultValue={pkg.name}
                              required
                              className={inputClass}
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <label
                              className={labelClass}
                              htmlFor={`package-${pkg.id}-price`}
                            >
                              Price
                            </label>
                            <input
                              id={`package-${pkg.id}-price`}
                              type="number"
                              min="0"
                              step="1"
                              name={`package_${pkg.id}_price`}
                              defaultValue={pkg.price}
                              required
                              className={inputClass}
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <label
                              className={labelClass}
                              htmlFor={`package-${pkg.id}-unit`}
                            >
                              Price unit
                            </label>
                            <select
                              id={`package-${pkg.id}-unit`}
                              name={`package_${pkg.id}_price_unit`}
                              defaultValue={pkg.price_unit}
                              className={inputClass}
                            >
                              <option value="per_event">Per event</option>
                              <option value="per_pax">Per guest</option>
                              <option value="per_hour">Per hour</option>
                              <option value="per_day">Per day</option>
                            </select>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-2">
                              <label
                                className={labelClass}
                                htmlFor={`package-${pkg.id}-min`}
                              >
                                Min guests
                              </label>
                              <input
                                id={`package-${pkg.id}-min`}
                                type="number"
                                min="0"
                                step="1"
                                name={`package_${pkg.id}_min_guests`}
                                defaultValue={pkg.min_guests ?? ""}
                                className={inputClass}
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label
                                className={labelClass}
                                htmlFor={`package-${pkg.id}-max`}
                              >
                                Max guests
                              </label>
                              <input
                                id={`package-${pkg.id}-max`}
                                type="number"
                                min="0"
                                step="1"
                                name={`package_${pkg.id}_max_guests`}
                                defaultValue={pkg.max_guests ?? ""}
                                className={inputClass}
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:col-span-2">
                            <label
                              className={labelClass}
                              htmlFor={`package-${pkg.id}-description`}
                            >
                              Description
                            </label>
                            <textarea
                              id={`package-${pkg.id}-description`}
                              name={`package_${pkg.id}_description`}
                              rows={3}
                              defaultValue={pkg.description ?? ""}
                              className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]"
                            />
                          </div>

                          <div className="flex flex-col gap-2 sm:col-span-2">
                            <label
                              className={labelClass}
                              htmlFor={`package-${pkg.id}-inclusions`}
                            >
                              Package inclusions, one per line
                            </label>
                            <textarea
                              id={`package-${pkg.id}-inclusions`}
                              name={`package_${pkg.id}_inclusions`}
                              rows={4}
                              defaultValue={textFromLines(pkg.inclusions)}
                              className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4 text-sm font-semibold text-[#64748b]">
                      No packages yet. Add the first package below.
                    </div>
                  )}

                  <div className="rounded-2xl border border-dashed border-[#bfdbfe] bg-[#eff6ff] p-4">
                    <p className="mb-4 text-sm font-black text-[#1d4ed8]">
                      Add a new package
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <label
                          className={labelClass}
                          htmlFor="new-package-name"
                        >
                          Package name
                        </label>
                        <input
                          id="new-package-name"
                          name="new_package_name"
                          className={inputClass}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label
                          className={labelClass}
                          htmlFor="new-package-price"
                        >
                          Price
                        </label>
                        <input
                          id="new-package-price"
                          type="number"
                          min="0"
                          step="1"
                          name="new_package_price"
                          className={inputClass}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label
                          className={labelClass}
                          htmlFor="new-package-unit"
                        >
                          Price unit
                        </label>
                        <select
                          id="new-package-unit"
                          name="new_package_price_unit"
                          defaultValue="per_event"
                          className={inputClass}
                        >
                          <option value="per_event">Per event</option>
                          <option value="per_pax">Per guest</option>
                          <option value="per_hour">Per hour</option>
                          <option value="per_day">Per day</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-3 rounded-2xl border border-[#bfdbfe] bg-white px-3 py-3 text-sm font-semibold text-[#334155]">
                        <input
                          type="checkbox"
                          name="new_package_is_active"
                          defaultChecked
                          className="h-4 w-4 rounded border-[#d1d5db] text-[#2563eb]"
                        />
                        Active for customers
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                          <label
                            className={labelClass}
                            htmlFor="new-package-min"
                          >
                            Min guests
                          </label>
                          <input
                            id="new-package-min"
                            type="number"
                            min="0"
                            step="1"
                            name="new_package_min_guests"
                            className={inputClass}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label
                            className={labelClass}
                            htmlFor="new-package-max"
                          >
                            Max guests
                          </label>
                          <input
                            id="new-package-max"
                            type="number"
                            min="0"
                            step="1"
                            name="new_package_max_guests"
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <label
                          className={labelClass}
                          htmlFor="new-package-description"
                        >
                          Description
                        </label>
                        <textarea
                          id="new-package-description"
                          name="new_package_description"
                          rows={3}
                          className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]"
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <label
                          className={labelClass}
                          htmlFor="new-package-inclusions"
                        >
                          Package inclusions, one per line
                        </label>
                        <textarea
                          id="new-package-inclusions"
                          name="new_package_inclusions"
                          rows={4}
                          className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-5 rounded-2xl border border-[#e5e7eb] bg-white p-5 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2563eb]">
                    Rules, Parking & Accessibility
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#111827]">
                    Operational details customers need before booking
                  </h3>
                </div>

                <div className="flex flex-col gap-2 lg:col-span-2">
                  <label htmlFor="edit-venue-rules" className={labelClass}>
                    Venue rules, one per line
                  </label>
                  <textarea
                    id="edit-venue-rules"
                    name="venue_rules"
                    rows={5}
                    defaultValue={venue.venue_rules ?? ""}
                    placeholder="No smoking&#10;No loud music after 10 PM&#10;Cleanup policy applies"
                    className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]"
                  />
                </div>

                <div className="flex flex-col gap-2 lg:col-span-2">
                  <label
                    htmlFor="edit-cancellation-policy"
                    className={labelClass}
                  >
                    Cancellation or reservation policy
                  </label>
                  <textarea
                    id="edit-cancellation-policy"
                    name="cancellation_policy"
                    rows={4}
                    defaultValue={venue.cancellation_policy ?? ""}
                    className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
                  {(
                    [
                      ["air_conditioned", "Air-conditioning"],
                      ["parking_available", "Parking available"],
                      ["wheelchair_accessible", "Wheelchair accessible"],
                      ["overnight_accommodation", "Overnight accommodation"],
                      ["pet_friendly", "Pet friendly"],
                      ["has_pool", "Swimming pool"],
                      ["ceremony_venue", "Ceremony venue"],
                      ["reception_venue", "Reception venue"],
                    ] as [string, string][]
                  ).map(([name, label]) => (
                    <label
                      key={name}
                      className="flex items-center gap-3 rounded-2xl border border-[#dbe3ef] bg-[#f8fbff] px-3 py-3 text-sm font-semibold text-[#334155]"
                    >
                      <input
                        type="checkbox"
                        name={name}
                        defaultChecked={Boolean(venue[name])}
                        className="h-4 w-4 rounded border-[#d1d5db] text-[#2563eb]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <div className="flex flex-col gap-3 border-t border-[#e5e7eb] pt-5 sm:flex-row sm:justify-end">
                <DashButton href="/dashboard/venues" variant="secondary">
                  Cancel
                </DashButton>
                <button
                  id="edit-venue-save-btn"
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-200/70 transition hover:bg-[#1e40af] focus:outline-none focus:ring-4 focus:ring-[#dbeafe]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </Panel>

        <div className="space-y-6">
          <VenueVideoUpload
            venueId={venue.id}
            organizationId={venue.organization_id}
          />
          <VenuePhotoUpload
            venueId={venue.id}
            organizationId={venue.organization_id}
          />
        </div>
      </div>
    </DashboardSubPage>
  );
}
