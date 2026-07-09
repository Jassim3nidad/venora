import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VenueDetails from "@/src/features/venues/ui/VenueDetails";
import {
  getNearbyResearchVenueDetails,
  getPublicResearchReviews,
  getResearchVenueBySlug,
  researchVenues,
  toVenueDetailRecord,
  type ResearchVenue,
} from "@/src/features/venues/data/research-venues";
import { getPublishedVenueReviewsRaw } from "@/features/reviews/application/queries";
import { resolveVenueMapCoordinates } from "@/src/lib/venue-map-coordinates";

interface Props {
  params: Promise<{ slug: string }>;
}

const VENUE_DETAIL_SELECT = `
  *,
  venue_packages(*),
  venue_images(*),
  venue_amenities(amenities(name)),
  organizations(*)
`;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getResearchVenueByIdentifier(identifier: string) {
  return (
    getResearchVenueBySlug(identifier) ??
    researchVenues.find((venue) => venue.id === identifier) ??
    null
  );
}

async function getPublishedVenueByIdentifier(
  supabase: any,
  identifier: string,
) {
  let query = supabase
    .from("venues")
    .select(VENUE_DETAIL_SELECT)
    .eq("status", "published");

  query = isUuid(identifier)
    ? query.eq("id", identifier)
    : query.eq("slug", identifier);

  const { data } = await query.maybeSingle();
  return data ?? null;
}

function mergeVenueDetail(dbVenue: any, fallback?: ResearchVenue | null) {
  const fallbackRecord = fallback ? toVenueDetailRecord(fallback) : null;

  if (!dbVenue) return fallbackRecord;

  return {
    ...(fallbackRecord ?? {}),
    ...dbVenue,
    latitude: dbVenue.latitude ?? fallbackRecord?.latitude ?? null,
    longitude: dbVenue.longitude ?? fallbackRecord?.longitude ?? null,
    venue_images:
      dbVenue.venue_images?.length > 0
        ? dbVenue.venue_images
        : (fallbackRecord?.venue_images ?? []),
    venue_packages:
      dbVenue.venue_packages?.length > 0
        ? dbVenue.venue_packages
        : (fallbackRecord?.venue_packages ?? []),
    venue_amenities:
      dbVenue.venue_amenities?.length > 0
        ? dbVenue.venue_amenities
        : (fallbackRecord?.venue_amenities ?? []),
    organizations:
      dbVenue.organizations ?? fallbackRecord?.organizations ?? null,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = (await createClient()) as any;
  const dbVenue = await getPublishedVenueByIdentifier(supabase, slug);
  const datasetVenue = getResearchVenueByIdentifier(slug);
  const metadataVenue = dbVenue ?? datasetVenue;

  if (!metadataVenue) return { title: "Venue Not Found" };
  return {
    title: metadataVenue.name,
    description:
      "description" in metadataVenue
        ? (metadataVenue.description ?? undefined)
        : metadataVenue.short_description,
  };
}

export default async function VenueDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dbVenue = await getPublishedVenueByIdentifier(supabase, slug);
  const datasetVenue = getResearchVenueByIdentifier(
    dbVenue?.slug ?? dbVenue?.id ?? slug,
  );
  const venue = mergeVenueDetail(dbVenue, datasetVenue);

  if (!venue) notFound();

  const mapLocation = await resolveVenueMapCoordinates(venue);
  const venueWithMap = mapLocation
    ? {
        ...venue,
        mapLatitude: mapLocation.latitude,
        mapLongitude: mapLocation.longitude,
        mapZoom: mapLocation.zoom,
        mapPrecision: mapLocation.precision,
      }
    : venue;

  const reviews = dbVenue
    ? await getPublishedVenueReviewsRaw(supabase, venue.id)
    : getPublicResearchReviews();

  let eligibleReviewBooking: { id: string; event_date: string | null } | null =
    null;
  if (user && dbVenue) {
    const { data: reviewBookings } = await supabase
      .from("bookings")
      .select(
        `
          id,
          event_date,
          reviews (
            id
          )
        `,
      )
      .eq("customer_id", user.id)
      .eq("venue_id", venue.id)
      .eq("status", "completed")
      .order("event_date", { ascending: false });

    eligibleReviewBooking =
      (reviewBookings ?? []).find(
        (booking: any) => (booking.reviews ?? []).length === 0,
      ) ?? null;
  }

  const nearbyVenues = datasetVenue
    ? getNearbyResearchVenueDetails(datasetVenue)
    : [];

  let initialIsFavorited = false;
  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("customer_id")
      .eq("customer_id", user.id)
      .eq("venue_id", venue.id)
      .maybeSingle();

    initialIsFavorited = !!fav;
  }

  return (
    <VenueDetails
      venue={venueWithMap}
      reviews={reviews || []}
      nearbyVenues={nearbyVenues}
      initialIsFavorited={initialIsFavorited}
      currentUser={user}
      eligibleReviewBooking={eligibleReviewBooking}
    />
  );
}
