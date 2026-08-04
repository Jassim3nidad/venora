import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  DashButton,
  DashboardSubPage,
  EmptyState,
  Panel,
} from "@/components/dashboard/enterprise";
import {
  getOwnerDashboardContext,
  getOwnerVenueById,
  hasCoordinatorPermission,
} from "@/src/lib/dashboard/org-dashboard-data";
import { structuredVenueProfileRepository } from "@/src/features/venues/application/structured-profile-repository";
import { StructuredVenueEditorClient } from "./structured-venue-editor-client";

export const metadata: Metadata = {
  title: "Structured Venue Experience",
};

type IdParams = {
  id: string;
};

type VenueMediaRow = {
  id: string;
  storage_path: string;
  media_type: "image" | "video" | string;
  alt_text: string | null;
  display_order: number | null;
  is_featured: boolean | null;
};

type AmenityRow = { id: string; name: string };
type EventTypeRow = { id: string; name: string };
type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_unit: string;
  min_guests: number | null;
  max_guests: number | null;
  is_active: boolean;
};

type CapacityLayoutRow = {
  id: string;
  space_id: string;
  layout: string;
  custom_layout_label: string | null;
  capacity: number;
  notes: string | null;
  display_order: number;
};

type SpaceAmenityRow = {
  space_id: string;
  amenity_id: string;
  notes: string | null;
};

type SpaceEventTypeRow = {
  space_id: string;
  event_type_id: string;
  notes: string | null;
};

function unwrapRepoResult<T>(result: {
  ok: true;
  data: T;
} | {
  ok: false;
  error: { message: string };
}) {
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export default async function StructuredVenueExperiencePage({
  params,
}: {
  params: Promise<IdParams>;
}) {
  const { id } = await params;
  const context = await getOwnerDashboardContext();
  const venue = await getOwnerVenueById(
    context,
    id,
    "id, organization_id, name, slug, status, city, province, address, description, capacity_min, capacity_max, indoor_outdoor, base_price, price_unit",
  );

  if (!venue) notFound();

  const isOwner =
    context.isAdmin || context.roles.includes("venue_owner");
  const isCoordinatorOnly =
    !isOwner && context.roles.includes("event_coordinator");
  const canEdit =
    isOwner ||
    hasCoordinatorPermission("manage_assigned_venue_listings", context);

  if (!canEdit) {
    return (
      <DashboardSubPage
        title="Structured Venue Experience"
        description="This editor is available to venue owners and coordinators with listing-management permission."
        action={
          <DashButton
            href={
              isCoordinatorOnly
                ? "/dashboard/coordinator/venues"
                : "/dashboard/venues"
            }
            variant="secondary"
            icon="arrow_back"
          >
            Back to Venues
          </DashButton>
        }
      >
        <EmptyState
          icon="lock"
          title="Access unavailable"
          description="You can view this venue, but editing its structured customer experience requires listing-management permission."
        />
      </DashboardSubPage>
    );
  }

  const [draftResult, publishedResult] = await Promise.all([
    structuredVenueProfileRepository.findDraftProfileForVenue(
      context.supabase,
      id,
    ),
    structuredVenueProfileRepository.findPublishedProfileForVenue(
      context.supabase,
      id,
    ),
  ]);

  const draftProfile = unwrapRepoResult(draftResult);
  const publishedProfile = unwrapRepoResult(publishedResult);
  const activeSpaceIds = (draftProfile?.spaces ?? [])
    .filter((space) => space.status !== "archived")
    .map((space) => space.id);

  const [
    amenitiesResult,
    eventTypesResult,
    packagesResult,
    venueImagesResult,
    capacityLayoutsResult,
    spaceAmenitiesResult,
    spaceEventTypesResult,
  ] = await Promise.all([
    context.supabase.from("amenities").select("id, name").order("name"),
    context.supabase.from("event_types").select("id, name").order("name"),
    context.supabase
      .from("venue_packages")
      .select(
        "id, name, description, price, price_unit, min_guests, max_guests, is_active",
      )
      .eq("venue_id", id)
      .order("created_at", { ascending: true }),
    context.supabase
      .from("venue_images")
      .select("id, storage_path, media_type, alt_text, display_order, is_featured")
      .eq("venue_id", id)
      .order("display_order", { ascending: true }),
    activeSpaceIds.length > 0
      ? context.supabase
          .from("venue_space_capacity_layouts")
          .select(
            "id, space_id, layout, custom_layout_label, capacity, notes, display_order",
          )
          .in("space_id", activeSpaceIds)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [] }),
    activeSpaceIds.length > 0
      ? context.supabase
          .from("venue_space_amenities")
          .select("space_id, amenity_id, notes")
          .in("space_id", activeSpaceIds)
      : Promise.resolve({ data: [] }),
    activeSpaceIds.length > 0
      ? context.supabase
          .from("venue_space_event_types")
          .select("space_id, event_type_id, notes")
          .in("space_id", activeSpaceIds)
      : Promise.resolve({ data: [] }),
  ]);

  const fetchError =
    amenitiesResult.error ||
    eventTypesResult.error ||
    packagesResult.error ||
    venueImagesResult.error ||
    capacityLayoutsResult.error ||
    spaceAmenitiesResult.error ||
    spaceEventTypesResult.error;

  if (fetchError) {
    return (
      <DashboardSubPage
        title="Structured Venue Experience"
        description="Prepare a richer customer-facing venue profile."
      >
        <Panel>
          <h2 className="text-lg font-bold text-[#0f172a]">
            Unable to load editor data
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">
            The structured editor could not load its supporting data. Refresh
            the page or return to the venue list.
          </p>
          <Link
            href="/dashboard/venues"
            className="mt-5 inline-flex text-sm font-bold text-[#1d4ed8] hover:underline"
          >
            Back to venues
          </Link>
        </Panel>
      </DashboardSubPage>
    );
  }

  return (
    <DashboardSubPage
      title="Structured Venue Experience"
      description="Build the private draft that will power Venora's richer venue profile. Your current public listing remains visible until you publish."
      action={
        <div className="flex flex-wrap gap-2">
          <DashButton
            href={`/dashboard/venues/${id}/edit`}
            variant="secondary"
            icon="edit"
          >
            Base Listing
          </DashButton>
          <DashButton
            href={
              isCoordinatorOnly
                ? "/dashboard/coordinator/venues"
                : "/dashboard/venues"
            }
            variant="secondary"
            icon="arrow_back"
          >
            Back
          </DashButton>
        </div>
      }
    >
      <StructuredVenueEditorClient
        venue={venue}
        draftProfile={draftProfile}
        publishedProfile={publishedProfile}
        amenities={(amenitiesResult.data ?? []) as AmenityRow[]}
        eventTypes={(eventTypesResult.data ?? []) as EventTypeRow[]}
        packages={(packagesResult.data ?? []) as PackageRow[]}
        venueImages={(venueImagesResult.data ?? []) as VenueMediaRow[]}
        capacityLayouts={
          (capacityLayoutsResult.data ?? []) as CapacityLayoutRow[]
        }
        spaceAmenities={(spaceAmenitiesResult.data ?? []) as SpaceAmenityRow[]}
        spaceEventTypes={
          (spaceEventTypesResult.data ?? []) as SpaceEventTypeRow[]
        }
        canPublish={isOwner}
        isCoordinatorOnly={isCoordinatorOnly}
      />
    </DashboardSubPage>
  );
}
