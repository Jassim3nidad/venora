import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import VenueDetails from "@/src/features/venues/ui/VenueDetails";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient() as any;
  const { data: venue } = await supabase
    .from("venues")
    .select("name, description")
    .eq("slug", slug)
    .single();

  if (!venue) return { title: "Venue Not Found" };
  return {
    title: venue.name,
    description: venue.description ?? undefined,
  };
}

export default async function VenueDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient() as any;

  // 1. Fetch current user session
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Fetch primary venue details
  const { data: venue } = await supabase
    .from("venues")
    .select(`
      *,
      venue_packages(*),
      venue_images(*),
      venue_amenities(amenities(name)),
      organizations(*)
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!venue) notFound();

  // 3. Fetch reviews associated with this venue
  const { data: reviews } = await supabase
    .from("reviews")
    .select(`
      *,
      profiles(
        full_name,
        avatar_url
      )
    `)
    .eq("venue_id", venue.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  // 4. Fetch nearby venues in the same province
  const { data: nearbyVenues } = await supabase
    .from("venues")
    .select(`
      *,
      venue_images(
        storage_path,
        is_featured
      )
    `)
    .eq("province", venue.province)
    .eq("status", "published")
    .neq("id", venue.id)
    .order("avg_rating", { ascending: false })
    .limit(3);

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
    <VenueDetails
      venue={venue}
      reviews={reviews || []}
      nearbyVenues={nearbyVenues || []}
      initialIsFavorited={initialIsFavorited}
      currentUser={user}
    />
  );
}
