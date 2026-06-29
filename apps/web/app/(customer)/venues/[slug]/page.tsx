import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";

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
    .single();

  if (!venue) return { title: "Venue Not Found" };
  return {
    title: venue.name,
    description: venue.description ?? undefined,
  };
}

export default async function VenueDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = (await createClient()) as any;

  const { data: venue } = await supabase
    .from("venues")
    .select("*, venue_packages(*), venue_images(*), venue_amenities(amenities(name))")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!venue) notFound();

  const featuredImage = venue.venue_images?.find((img: any) => img.is_featured) ?? venue.venue_images?.[0];
  const coverImageUrl = featuredImage ? `/storage/v1/object/public/venues/${featuredImage.storage_path}` : null;
  const amenitiesList = venue.venue_amenities?.map((va: any) => va.amenities?.name).filter(Boolean) ?? [];

  return (
    <main className="container" style={{ paddingBlock: "2rem" }}>
      {/* Hero image */}
      <div
        style={{
          height: 400,
          borderRadius: "1.25rem",
          marginBottom: "2rem",
          background: coverImageUrl
            ? `url(${coverImageUrl}) center/cover`
            : "linear-gradient(135deg, hsl(217 70% 35%), hsl(217 80% 55%))",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgb(0 0 0 / 0.6), transparent)",
        }} />
        <div style={{ position: "absolute", bottom: "2rem", left: "2rem", color: "#fff" }}>
          <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "2.5rem", fontWeight: 700 }}>
            {venue.name}
          </h1>
          <p style={{ opacity: 0.85, marginTop: "0.25rem" }}>📍 {venue.address}, {venue.city}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "2rem", alignItems: "start" }}>
        {/* Left column */}
        <div>
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>About this venue</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>{venue.description}</p>
          </section>

          {amenitiesList.length > 0 && (
            <section style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Amenities</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {amenitiesList.map((a: string) => (
                  <span key={a} style={{ padding: "0.25rem 0.875rem", borderRadius: "999px", background: "hsl(217 70% 47% / 0.1)", color: "hsl(217 70% 47%)", fontSize: "0.875rem", fontWeight: 500 }}>
                    {a}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Packages</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(venue.venue_packages ?? []).map((pkg: any) => (
                <div key={pkg.id} style={{ padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid var(--border-default)", background: "var(--bg-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: 700 }}>{pkg.name}</span>
                    <span style={{ fontWeight: 700, color: "hsl(217 70% 47%)" }}>₱{pkg.price?.toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{pkg.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right column — sticky booking card */}
        <div style={{ position: "sticky", top: "5rem" }}>
          <div className="glass" style={{ padding: "1.75rem", borderRadius: "1.25rem" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(217 70% 47%)", marginBottom: "0.25rem" }}>
              ₱{venue.base_price?.toLocaleString()}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>Starting price per day</p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              <span>👥 {venue.capacity_min}–{venue.capacity_max} guests</span>
            </div>
            <Link
              href={`/venues/${venue.slug}/book`}
              id="venue-book-btn"
              style={{
                display: "block",
                textAlign: "center",
                padding: "0.875rem",
                borderRadius: "0.75rem",
                background: "hsl(217 70% 47%)",
                color: "#fff",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 4px 16px -4px hsl(217 70% 47% / 0.5)",
              }}
            >
              Book This Venue
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
