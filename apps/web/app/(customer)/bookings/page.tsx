import type { Metadata } from "next";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "My Bookings" };

const STATUS_COLORS: Record<string, string> = {
  pending:   "hsl(45 96% 54%)",
  approved:  "hsl(142 71% 45%)",
  declined:  "hsl(0 72% 51%)",
  cancelled: "hsl(0 72% 51%)",
  completed: "hsl(217 91% 60%)",
  expired:   "hsl(217 70% 47%)",
};

export default async function BookingsPage() {
  const supabase = (await createClient()) as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, event_date, status, total_amount, venues(name, slug)")
    .eq("customer_id", user.id)
    .order("event_date", { ascending: false });

  return (
    <main className="container" style={{ paddingBlock: "2rem" }}>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        My Bookings
      </h1>

      {!bookings || bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "3rem" }}>📅</div>
          <p style={{ marginTop: "1rem" }}>No bookings yet.</p>
          <a href="/venues" style={{ color: "hsl(217 70% 47%)", marginTop: "0.5rem", display: "block" }}>Browse venues →</a>
        </div>
      ) : (
        <div id="bookings-list" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {bookings.map((b: any) => (
            <div
              key={b.id}
              id={`booking-row-${b.id}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.25rem 1.5rem",
                borderRadius: "0.875rem",
                border: "1px solid var(--border-default)",
                background: "var(--bg-subtle)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                  {(b.venues as { name: string } | null)?.name}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  {new Date(b.event_date).toLocaleDateString("en-PH", { dateStyle: "long" })}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <span style={{ fontWeight: 700 }}>₱{b.total_amount?.toLocaleString()}</span>
                <span style={{
                  padding: "0.2rem 0.875rem",
                  borderRadius: "999px",
                  background: `${STATUS_COLORS[b.status] ?? "hsl(217 70% 47%)"}20`,
                  color: STATUS_COLORS[b.status] ?? "hsl(217 70% 47%)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}>
                  {b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
