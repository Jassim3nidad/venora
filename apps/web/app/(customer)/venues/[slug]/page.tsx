import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import { createClient } from "@/lib/supabase/server";
import VenueDetails from "@/src/features/venues/ui/VenueDetails";
import {
  getNearbyResearchVenueDetails,
  getPublicResearchReviews,
  getResearchVenueBySlug,
  getResearchVenueDetailBySlug,
  researchVenues,
} from "@/src/features/venues/data/research-venues";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = (await createClient()) as any;
  const { data: venue } = await supabase
    .from("venues")
    .select("name, description")
    .eq("slug", slug)
    .in(
      "id",
      researchVenues.map((item) => item.id),
    )
    .maybeSingle();

  const datasetVenue = getResearchVenueBySlug(slug);
  const metadataVenue = datasetVenue ?? venue;

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

  // 1. Fetch current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Fetch primary venue details
  const { data: dbVenue } = await supabase
    .from("venues")
    .select(
      `
      *,
      venue_packages(*),
      venue_images(*),
      venue_amenities(amenities(name)),
      organizations(*)
    `,
    )
    .eq("slug", slug)
    .in(
      "id",
      researchVenues.map((item) => item.id),
    )
    .eq("status", "published")
    .maybeSingle();

  const datasetVenue = getResearchVenueBySlug(slug);
  const venue = getResearchVenueDetailBySlug(slug);

  if (!venue || !datasetVenue) notFound();

  // 3. Fetch reviews associated with this venue
  const { data: reviews } = dbVenue
    ? await supabase
        .from("reviews")
        .select(
          `
          *,
          profiles(
            full_name,
            avatar_url
          )
        `,
        )
        .eq("venue_id", venue.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
    : { data: getPublicResearchReviews() };

  // 4. Fetch nearby venues in the same province
  const nearbyVenues = getNearbyResearchVenueDetails(datasetVenue);

  // 5. Fetch user favorite status
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
    <>
      <CustomerNavbar user={user} />

      <VenueDetails
        venue={venue}
        reviews={reviews || []}
        nearbyVenues={nearbyVenues}
        initialIsFavorited={initialIsFavorited}
        currentUser={user}
      />
    </>
  );
}
