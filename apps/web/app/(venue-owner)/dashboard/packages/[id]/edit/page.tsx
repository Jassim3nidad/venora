import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardSubPage } from "@/components/dashboard/enterprise";
import { getOwnerDashboardContext, getOwnerVenueIds } from "../../../_lib/owner-dashboard-data";
import { getEligiblePackageSuppliers, getPackageForEditing } from "@/src/features/venues/application/package-queries";
import { PackageBuilderForm, type PackageInitialData } from "../../new/_components/PackageBuilderForm";

export const metadata: Metadata = { title: "Edit Package — Dashboard" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPackagePage(props: Props) {
  const { id: packageId } = await props.params;
  const context = await getOwnerDashboardContext();
  const { supabase, isAdmin, roles, permissions } = context;

  const canManagePackages =
    isAdmin ||
    roles.includes("venue_owner") ||
    (roles.includes("event_coordinator") &&
      permissions.includes("manage_assigned_venue_listings"));

  if (!canManagePackages) {
    redirect("/unauthorized");
  }

  const venueIds = await getOwnerVenueIds(context);

  if (venueIds.length === 0) {
    redirect(
      roles.includes("event_coordinator") && !roles.includes("venue_owner")
        ? "/dashboard/coordinator/venues"
        : "/dashboard/venues",
    );
  }

  // Fetch the package
  const pkgRaw = await getPackageForEditing(packageId);

  if (!pkgRaw || (!isAdmin && !venueIds.includes(pkgRaw.venue_id))) {
    redirect("/dashboard/packages");
  }

  const initialData: PackageInitialData = {
    id: pkgRaw.id,
    venueId: pkgRaw.venue_id,
    name: pkgRaw.name,
    description: pkgRaw.description || "",
    eventTypeId: pkgRaw.event_type_id || "",
    minGuests: pkgRaw.min_guests ?? "",
    maxGuests: pkgRaw.max_guests ?? "",
    price: pkgRaw.price ?? "",
    priceUnit: pkgRaw.price_unit,
    depositPercentage: pkgRaw.deposit_percentage ?? "",
    depositFlatAmount: pkgRaw.deposit_flat_amount ?? "",
    validFrom: pkgRaw.valid_from || "",
    validUntil: pkgRaw.valid_until || "",
    isActive: pkgRaw.is_active,
    amenityIds: pkgRaw.amenity_ids || [],
    venueRules: pkgRaw.venue_rules || "",
    inclusions: pkgRaw.inclusions || [],
    suppliers: (pkgRaw.package_suppliers || []).map((s: any) => ({
      supplierId: s.supplier_id,
      agreementId: s.agreement_id,
      includedPrice: s.included_price,
    })),
  };

  // Fetch owner venues (could just fetch the single venue but fetching all is fine for dropdown parity)
  const { data: venuesRaw } = await supabase
    .from("venues")
    .select("id, name, province, city, capacity_max")
    .in("id", venueIds)
    .eq("status", "published")
    .order("name", { ascending: true });

  const venues = (venuesRaw ?? []) as Array<{
    id: string;
    name: string;
    province: string;
    city: string;
    capacity_max: number;
  }>;

  if (venues.length === 0) {
    redirect("/dashboard/venues");
  }

  // Fetch lookup data
  const [{ data: eventTypesRaw }, { data: amenitiesRaw }] = await Promise.all([
    supabase.from("event_types").select("id, name").order("name"),
    supabase.from("amenities").select("id, name").order("name"),
  ]);

  const eventTypes = (eventTypesRaw ?? []) as { id: string; name: string }[];
  const amenities = (amenitiesRaw ?? []) as { id: string; name: string }[];

  // Pre-fetch eligible suppliers per venue
  const eligibleSuppliersByVenue: Record<string, Awaited<ReturnType<typeof getEligiblePackageSuppliers>>> = {};
  await Promise.all(
    venues.map(async (v) => {
      eligibleSuppliersByVenue[v.id] = await getEligiblePackageSuppliers(v.id);
    })
  );

  return (
    <DashboardSubPage
      title="Edit Package"
      description="Update package pricing, amenities, and accredited suppliers."
    >
      <PackageBuilderForm
        venues={venues}
        eventTypes={eventTypes}
        amenities={amenities}
        eligibleSuppliersByVenue={eligibleSuppliersByVenue}
        initialData={initialData}
      />
    </DashboardSubPage>
  );
}
