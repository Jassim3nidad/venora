import type { Metadata } from "next";

export const metadata: Metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <main className="container" style={{ paddingBlock: "5rem" }}>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" }}>
        About Venora
      </h1>
      <p style={{ color: "var(--text-secondary)", maxWidth: 700, lineHeight: 1.8 }}>
        Venora is a venue booking marketplace built for the Philippines. We make
        it effortless for event planners and couples to discover, compare, and
        book the perfect venue — while giving venue owners powerful tools to
        manage bookings, staff, and analytics in one dashboard.
      </p>
    </main>
  );
}
