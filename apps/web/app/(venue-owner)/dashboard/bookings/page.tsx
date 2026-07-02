import type { Metadata } from "next";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  DashboardSubPage,
  EmptyState,
  Panel,
  StatusBadge,
} from "@/components/dashboard/enterprise/ui";

export const metadata: Metadata = { title: "Bookings — Dashboard" };

export default async function OwnerBookingsPage() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);
  const orgIds = (members ?? []).map((m: any) => m.organization_id);

  const { data: venues } = await supabase
    .from("venues")
    .select("id")
    .in("organization_id", orgIds.length ? orgIds : ["__none__"]);
  const venueIds = (venues ?? []).map((v: any) => v.id);

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, event_date, status, total_amount, guest_count, venues(name), profiles!customer_id(full_name)",
    )
    .in("venue_id", venueIds.length ? venueIds : ["__none__"])
    .order("event_date", { ascending: false });

  return (
    <DashboardSubPage
      title="Bookings"
      description="Review, accept, or decline booking requests across your venues."
    >
      {!bookings?.length ? (
        <EmptyState
          title="No bookings yet"
          description="When customers request your venues, they'll appear here for review."
        />
      ) : (
        <div className="space-y-3">
          {(bookings ?? []).map((b: any) => (
            <Panel key={b.id} className="p-0">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#191c1e]">
                    {(b.venues as { name: string } | null)?.name ?? "Venue"}
                  </p>
                  <p className="mt-1 text-sm text-[#565e74]">
                    {(b.profiles as { full_name: string } | null)?.full_name ?? "Guest"} ·{" "}
                    {new Date(b.event_date).toLocaleDateString("en-PH", {
                      dateStyle: "medium",
                    })}{" "}
                    · {b.guest_count} guests
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="font-display text-lg font-bold">
                    ₱{b.total_amount?.toLocaleString() ?? "—"}
                  </span>
                  <StatusBadge status={b.status} />
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </DashboardSubPage>
  );
}
