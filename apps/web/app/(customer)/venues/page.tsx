import type { Metadata } from "next";
import { createClient } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Browse Venues" };

// Server Component — data fetched on the server, no loading states needed
export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = (await createClient()) as any;

  let query = supabase
    .from("venues")
    .select("id, name, slug, city, base_price, capacity_max, status, venue_images(storage_path, is_featured)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(24);

  if (params.city) query = query.eq("city", params.city);
  if (params.q)    query = query.ilike("name", `%${params.q}%`);

  const { data: venues } = await query;

  return (
    <main className="container" style={{ paddingBlock: "2rem" }}>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Browse Venues
      </h1>

      {/* Search bar */}
      <form id="venue-search-form" style={{ marginBottom: "2rem", display: "flex", gap: "0.75rem" }}>
        <input
          id="venue-search-input"
          name="q"
          defaultValue={params.q}
          type="search"
          placeholder="Search venues…"
          style={{
            flex: 1,
            height: "2.75rem",
            borderRadius: "0.625rem",
            border: "1px solid var(--border-default)",
            padding: "0 1rem",
            background: "var(--bg-subtle)",
            fontSize: "0.9375rem",
            outline: "none",
          }}
        />
        <button
          id="venue-search-btn"
          type="submit"
          style={{
            height: "2.75rem",
            padding: "0 1.5rem",
            borderRadius: "0.625rem",
            background: "hsl(217 70% 47%)",
            color: "#fff",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>

      {/* Venue grid */}
      {!venues || venues.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "3rem" }}>🏛️</div>
          <p style={{ marginTop: "1rem" }}>No venues found. Try a different search.</p>
        </div>
      ) : (
        <div
          id="venue-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {venues.map((venue: any) => {
            const featuredImage = venue.venue_images?.find((img: any) => img.is_featured) ?? venue.venue_images?.[0];
            const coverImageUrl = featuredImage ? `/storage/v1/object/public/venues/${featuredImage.storage_path}` : null;
            return (
              <a
                key={venue.id}
                href={`/venues/${venue.slug}`}
                id={`venue-card-${venue.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "1rem",
                  overflow: "hidden",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-subtle)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                {/* Image placeholder */}
                <div
                  style={{
                    height: 200,
                    background: coverImageUrl
                      ? `url(${coverImageUrl}) center/cover`
                      : "linear-gradient(135deg, hsl(217 70% 35%), hsl(217 80% 55%))",
                    flexShrink: 0,
                  }}
                />
              <div style={{ padding: "1.25rem", flex: 1 }}>
                <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>{venue.name}</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "0.75rem" }}>
                  📍 {venue.city}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "hsl(217 70% 47%)" }}>
                    ₱{venue.base_price?.toLocaleString()}
                    <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.75rem" }}>/day</span>
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Up to {venue.capacity_max} guests
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
      )}
    </main>
  );
}
