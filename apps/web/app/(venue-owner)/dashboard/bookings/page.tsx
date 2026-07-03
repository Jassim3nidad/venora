import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import {
  DashboardSubPage,
  DataTable,
  StatusBadge,
  DashButton,
} from "@/components/dashboard/enterprise";

export const metadata: Metadata = { title: "Bookings - Dashboard" };

export default async function OwnerBookingsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);
  const orgIds = (members ?? []).map((m: { organization_id: string }) => m.organization_id);

  const { data: venues } = await supabase
    .from("venues")
    .select("id")
    .in("organization_id", orgIds.length ? orgIds : ["__none__"]);
  const venueIds = (venues ?? []).map((v: { id: string }) => v.id);

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, event_date, status, total_amount, guest_count, venues(name), profiles!customer_id(full_name)",
    )
    .in("venue_id", venueIds.length ? venueIds : ["__none__"])
    .order("event_date", { ascending: false });

  type BookingRow = {
    id: string;
    event_date: string;
    status: string;
    total_amount: number | null;
    guest_count: number;
    venues: { name: string } | null;
    profiles: { full_name: string } | null;
  };

  type BookingDisplayRow = {
    id: string;
    venue: string;
    customer: string;
    date: string;
    guests: number;
    amount: string;
    status: string;
  };

  const rows: BookingDisplayRow[] = (bookings ?? []).map((b: BookingRow) => {
    const venue = b.venues as { name: string } | null;
    const customer = b.profiles as { full_name: string } | null;

    return {
      id: b.id,
      venue: venue?.name ?? "-",
      customer: customer?.full_name ?? "-",
      date: new Date(b.event_date).toLocaleDateString("en-PH", {
        dateStyle: "medium",
      }),
      guests: b.guest_count,
      amount: b.total_amount
        ? `₱${Number(b.total_amount).toLocaleString()}`
        : "-",
      status: b.status,
    };
  });

  return (
    <DashboardSubPage
      title="Bookings"
      description="Manage reservation requests and confirmed events across your venues."
      action={<DashButton href="/dashboard/calendar" variant="secondary" icon="event">Calendar</DashButton>}
    >
      <DataTable
        rows={rows}
        keyFn={(r) => r.id}
        emptyMessage="No bookings found for your venues."
        columns={[
          {
            key: "venue",
            header: "Venue",
            cell: (r) => (
              <span className="font-semibold text-[#111827]">{r.venue}</span>
            ),
          },
          { key: "customer", header: "Customer", cell: (r) => r.customer },
          { key: "date", header: "Event Date", cell: (r) => r.date },
          { key: "guests", header: "Guests", cell: (r) => r.guests },
          {
            key: "amount",
            header: "Amount",
            cell: (r) => (
              <span className="font-semibold text-[#111827]">{r.amount}</span>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (r) => <StatusBadge status={r.status} />,
          },
        ]}
      />
    </DashboardSubPage>
  );
}
