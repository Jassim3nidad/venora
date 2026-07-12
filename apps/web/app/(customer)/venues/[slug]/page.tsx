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
import { userOwnsVenue } from "@/src/lib/rbac/ownership";
import { buildVenueImageUrl } from "@/src/features/venues/utils/venue-mappers";
import { absoluteUrl } from "@/src/lib/site-url";

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

// metadataVenue is either a raw DB row (venue_images: [{storage_path,
// is_featured}]) or a raw ResearchVenue (photos: {cover_image_url,
// image_urls}) — generateMetadata runs before the two shapes are merged
// into the normalized record the page body uses, so both are handled here.
function resolveVenueOgImage(metadataVenue: any): string | undefined {
  if (Array.isArray(metadataVenue.venue_images) && metadataVenue.venue_images.length > 0) {
    const featured =
      metadataVenue.venue_images.find((img: any) => img.is_featured) ??
      metadataVenue.venue_images[0];
    if (featured?.storage_path) return buildVenueImageUrl(featured.storage_path);
  }
  if (metadataVenue.photos) {
    const url = metadataVenue.photos.cover_image_url ?? metadataVenue.photos.image_urls?.[0];
    if (url) return url;
  }
  return undefined;
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
  const activePackages = (dbVenue.venue_packages ?? []).filter(
    (pkg: any) => pkg.is_active !== false,
  );

  return {
    ...(fallbackRecord ?? {}),
    ...dbVenue,
    latitude: dbVenue.latitude ?? fallbackRecord?.latitude ?? null,
    longitude: dbVenue.longitude ?? fallbackRecord?.longitude ?? null,
    venue_images:
      dbVenue.venue_images?.length > 0
        ? dbVenue.venue_images
        : (fallbackRecord?.venue_images ?? []),
    venue_packages: activePackages,
    venue_amenities: dbVenue.venue_amenities ?? [],
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
  const description =
    "description" in metadataVenue
      ? (metadataVenue.description ?? undefined)
      : metadataVenue.short_description;
  const ogImage = resolveVenueOgImage(metadataVenue);

  return {
    title: metadataVenue.name,
    description,
    alternates: { canonical: `/venues/${slug}` },
    openGraph: {
      title: metadataVenue.name,
      description,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: metadataVenue.name,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

function buildVenueJsonLd(venue: any, canonicalUrl: string) {
  const image = resolveVenueOgImage(venue);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "EventVenue",
    name: venue.name,
    description: venue.description ?? undefined,
    url: canonicalUrl,
    ...(image ? { image: [image] } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address ?? undefined,
      addressLocality: venue.city ?? undefined,
      addressRegion: venue.province ?? undefined,
      addressCountry: "PH",
    },
  };

  if (typeof venue.latitude === "number" && typeof venue.longitude === "number") {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: venue.latitude,
      longitude: venue.longitude,
    };
  }

  if (venue.review_count > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: venue.avg_rating,
      reviewCount: venue.review_count,
    };
  }

  return jsonLd;
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

  let isOwnVenue = false;
  if (user && dbVenue) {
    isOwnVenue = await userOwnsVenue(supabase, user.id, dbVenue.id);
  }

  const jsonLd = buildVenueJsonLd(venue, absoluteUrl(`/venues/${slug}`));

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <VenueDetails
        venue={venueWithMap}
        reviews={reviews || []}
        nearbyVenues={nearbyVenues}
        initialIsFavorited={initialIsFavorited}
        currentUser={user}
        eligibleReviewBooking={eligibleReviewBooking}
        isOwnVenue={isOwnVenue}
      />
    </>
  );
}
