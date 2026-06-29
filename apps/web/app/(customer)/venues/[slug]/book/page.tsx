import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Book — ${slug.replace(/-/g, " ")}` };
}

export default async function BookVenuePage({ params }: Props) {
  const { slug } = await params;
  const supabase = (await createClient()) as any;

  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, slug, base_price, capacity_min, capacity_max, venue_packages(*)")
    .eq("slug", slug)
    .single();

  if (!venue) notFound();

  return (
    <main className="container" style={{ paddingBlock: "2rem", maxWidth: 640 }}>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        Book {venue.name}
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Fill in your event details below. You won&apos;t be charged until the venue confirms.
      </p>

      <form id="booking-form" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="booking-event-date" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Event date</label>
            <input id="booking-event-date" type="date" name="event_date"
              style={{ height: "2.75rem", borderRadius: "0.625rem", border: "1px solid var(--border-default)", padding: "0 0.875rem", background: "var(--bg-subtle)", fontSize: "0.9375rem", outline: "none" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="booking-guest-count" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Guest count</label>
            <input id="booking-guest-count" type="number" name="guest_count"
              min={venue.capacity_min} max={venue.capacity_max}
              placeholder={`${venue.capacity_min}–${venue.capacity_max}`}
              style={{ height: "2.75rem", borderRadius: "0.625rem", border: "1px solid var(--border-default)", padding: "0 0.875rem", background: "var(--bg-subtle)", fontSize: "0.9375rem", outline: "none" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="booking-start-time" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Start time</label>
            <input id="booking-start-time" type="time" name="start_time"
              style={{ height: "2.75rem", borderRadius: "0.625rem", border: "1px solid var(--border-default)", padding: "0 0.875rem", background: "var(--bg-subtle)", fontSize: "0.9375rem", outline: "none" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label htmlFor="booking-end-time" style={{ fontSize: "0.875rem", fontWeight: 500 }}>End time</label>
            <input id="booking-end-time" type="time" name="end_time"
              style={{ height: "2.75rem", borderRadius: "0.625rem", border: "1px solid var(--border-default)", padding: "0 0.875rem", background: "var(--bg-subtle)", fontSize: "0.9375rem", outline: "none" }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="booking-notes" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Notes (optional)</label>
          <textarea
            id="booking-notes"
            name="notes"
            rows={4}
            placeholder="Tell the venue about your event…"
            style={{ borderRadius: "0.625rem", border: "1px solid var(--border-default)", padding: "0.75rem 0.875rem", background: "var(--bg-subtle)", fontSize: "0.9375rem", outline: "none", resize: "vertical", fontFamily: "inherit" }}
          />
        </div>

        {/* Price summary */}
        <div style={{ padding: "1.25rem", borderRadius: "0.75rem", background: "hsl(217 70% 47% / 0.05)", border: "1px solid hsl(217 70% 47% / 0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.875rem" }}>Base price</span>
            <span style={{ fontWeight: 600 }}>₱{venue.base_price?.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.75rem", borderTop: "1px solid var(--border-default)", marginTop: "0.75rem" }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 700, color: "hsl(217 70% 47%)" }}>₱{venue.base_price?.toLocaleString()}</span>
          </div>
        </div>

        <button id="booking-submit-btn" type="submit"
          style={{ height: "3rem", borderRadius: "0.75rem", background: "hsl(217 70% 47%)", color: "#fff", fontWeight: 700, fontSize: "1rem", border: "none", cursor: "pointer", boxShadow: "0 4px 16px -4px hsl(217 70% 47% / 0.5)" }}>
          Request Booking
        </button>
      </form>
    </main>
  );
}
