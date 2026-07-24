import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardSubPage } from "@/components/dashboard/enterprise";
import { getOwnerDashboardContext, getOwnerVenueIds } from "../../_lib/owner-dashboard-data";
import { getEligiblePackageSuppliers } from "@/src/features/venues/application/package-queries";
import { PackageBuilderForm } from "./_components/PackageBuilderForm";

export const metadata: Metadata = { title: "New Package — Dashboard" };
export const dynamic = "force-dynamic";

export default async function NewPackagePage() {
  const context = await getOwnerDashboardContext();
  const { supabase, isAdmin, roles } = context;

  if (!isAdmin && !roles.includes("venue_owner") && !roles.includes("coordinator")) {
    redirect("/unauthorized");
  }

  const venueIds = await getOwnerVenueIds(context);

  if (venueIds.length === 0) {
    redirect("/dashboard/venues");
  }

  // Fetch owner venues
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

  // Pre-fetch eligible suppliers per venue (so client can switch venues without a round trip)
  const eligibleSuppliersByVenue: Record<string, Awaited<ReturnType<typeof getEligiblePackageSuppliers>>> = {};
  await Promise.all(
    venues.map(async (v) => {
      eligibleSuppliersByVenue[v.id] = await getEligiblePackageSuppliers(v.id);
    })
  );

  return (
    <DashboardSubPage
      title="New Package"
      description="Build a venue package with pricing, amenities, and accredited suppliers."
    >
      <PackageBuilderForm
        venues={venues}
        eventTypes={eventTypes}
        amenities={amenities}
        eligibleSuppliersByVenue={eligibleSuppliersByVenue}
      />
    </DashboardSubPage>
  );
}
