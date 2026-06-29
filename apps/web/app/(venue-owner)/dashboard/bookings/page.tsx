import type { Metadata } from "next";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Bookings — Dashboard" };

const STATUS_COLORS: Record<string, string> = {
  pending:   "hsl(45 96% 54%)",
  approved:  "hsl(142 71% 45%)",
  declined:  "hsl(0 72% 51%)",
  cancelled: "hsl(0 72% 51%)",
  completed: "hsl(217 91% 60%)",
  expired:   "hsl(217 70% 47%)",
};

export default async function OwnerBookingsPage() {
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch organizations user belongs to
  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);
  const orgIds = (members ?? []).map((m: any) => m.organization_id);

  // Fetch venues for these organizations
  const { data: venues } = await supabase
    .from("venues")
    .select("id")
    .in("organization_id", orgIds.length ? orgIds : ["__none__"]);
  const venueIds = (venues ?? []).map((v: any) => v.id);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, event_date, status, total_amount, guest_count, venues(name), profiles!customer_id(full_name)")
    .in("venue_id", venueIds.length ? venueIds : ["__none__"])
    .order("event_date", { ascending: false });

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-sora, sans-serif)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Bookings
      </h1>
      <div id="owner-bookings-list" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {(bookings ?? []).map((b: any) => (
          <div key={b.id} id={`owner-booking-${b.id}`}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderRadius: "0.875rem", border: "1px solid var(--border-default)", background: "var(--bg-subtle)" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{(b.venues as { name: string } | null)?.name}</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                {(b.profiles as { full_name: string } | null)?.full_name} · {new Date(b.event_date).toLocaleDateString("en-PH")} · {b.guest_count} guests
              </div>
            </div>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>₱{b.total_amount?.toLocaleString()}</span>
              <span style={{ padding: "0.2rem 0.875rem", borderRadius: "999px", background: `${STATUS_COLORS[b.status]}20`, color: STATUS_COLORS[b.status], fontSize: "0.75rem", fontWeight: 600, textTransform: "capitalize" }}>
                {b.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
