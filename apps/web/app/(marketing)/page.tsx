import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Venora — Find & Book Your Perfect Venue",
};

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "2rem 1.5rem",
          background:
            "linear-gradient(135deg, hsl(217 50% 15%) 0%, hsl(217 70% 25%) 50%, hsl(45 96% 30%) 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative blobs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 50% -20%, hsl(217 80% 63% / 0.3), transparent)",
            pointerEvents: "none",
          }}
        />

        <div className="animate-slide-up" style={{ position: "relative", zIndex: 1, maxWidth: 800 }}>
          <span
            style={{
              display: "inline-block",
              padding: "0.25rem 1rem",
              borderRadius: "999px",
              background: "hsl(217 80% 63% / 0.2)",
              border: "1px solid hsl(217 80% 63% / 0.4)",
              color: "hsl(217 100% 87%)",
              fontSize: "0.875rem",
              fontWeight: 500,
              marginBottom: "1.5rem",
              backdropFilter: "blur(8px)",
            }}
          >
            🎉 Launching in the Philippines
          </span>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 7vw, 5rem)",
              fontFamily: "var(--font-sora, sans-serif)",
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#fff",
              marginBottom: "1.5rem",
            }}
          >
            Find & Book Your{" "}
            <span className="gradient-text">Perfect Venue</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
              color: "hsl(217 30% 85%)",
              maxWidth: 600,
              margin: "0 auto 2.5rem",
              lineHeight: 1.7,
            }}
          >
            From intimate garden weddings to grand corporate galas — Venora
            connects you with the finest event venues across the Philippines,
            instantly.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/venues"
              id="hero-browse-venues-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.875rem 2rem",
                borderRadius: "0.75rem",
                background: "hsl(217 70% 47%)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "1rem",
                textDecoration: "none",
                boxShadow: "0 8px 24px -4px hsl(217 70% 47% / 0.5)",
                transition: "all 0.2s",
              }}
            >
              Browse Venues
            </Link>
            <Link
              href="/register"
              id="hero-list-venue-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.875rem 2rem",
                borderRadius: "0.75rem",
                background: "rgb(255 255 255 / 0.1)",
                border: "1px solid rgb(255 255 255 / 0.3)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "1rem",
                textDecoration: "none",
                backdropFilter: "blur(8px)",
                transition: "all 0.2s",
              }}
            >
              List Your Venue
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "3rem",
            color: "rgb(255 255 255 / 0.8)",
            fontSize: "0.875rem",
          }}
        >
          {[
            ["500+", "Venues"],
            ["12K+", "Happy Customers"],
            ["₱2B+", "Bookings Processed"],
          ].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "1.5rem", color: "#fff" }}>{n}</div>
              <div>{l}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
