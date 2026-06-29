import type { Metadata } from "next";

export const metadata: Metadata = { title: "Favourites" };

export default function FavouritesPage() {
  return (
    <main className="container" style={{ paddingBlock: "2rem" }}>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Favourites
      </h1>
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "3rem" }}>❤️</div>
        <p style={{ marginTop: "1rem" }}>You haven&apos;t saved any venues yet.</p>
        <a href="/venues" style={{ color: "hsl(217 70% 47%)", marginTop: "0.5rem", display: "block" }}>Browse venues →</a>
      </div>
    </main>
  );
}
