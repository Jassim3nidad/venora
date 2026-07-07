import type { Metadata } from "next";
import {
  DashboardSubPage,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import {
  formatPeso,
  getOwnerDashboardContext,
  getOwnerVenueIds,
} from "../_lib/owner-dashboard-data";

export const metadata: Metadata = { title: "Analytics - Dashboard" };

type AnalyticsBooking = {
  id: string;
  event_date: string;
  status: string;
  total_amount: number | null;
};

type AnalyticsVenue = {
  id: string;
  status: string;
  avg_rating: number;
  review_count: number;
};

function monthLabel(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    year: "numeric",
  });
}

export default async function AnalyticsPage() {
  const context = await getOwnerDashboardContext();
  const { supabase, orgIds, isAdmin } = context;

  let venuesQuery = supabase
    .from("venues")
    .select("id, status, avg_rating, review_count");
  if (!isAdmin) venuesQuery = venuesQuery.in("organization_id", orgIds);

  const { data: venues } =
    isAdmin || orgIds.length > 0 ? await venuesQuery : { data: [] };

  const venueIds = await getOwnerVenueIds(context);
  const { data: bookings } =
    venueIds.length > 0
      ? await supabase
          .from("bookings")
          .select("id, event_date, status, total_amount")
          .in("venue_id", venueIds)
          .order("event_date", { ascending: false })
      : { data: [] };

  const venueRows = (venues ?? []) as AnalyticsVenue[];
  const bookingRows = (bookings ?? []) as AnalyticsBooking[];
  const revenueBookings = bookingRows.filter((booking) =>
    ["approved", "confirmed", "completed"].includes(booking.status),
  );
  const totalRevenue = revenueBookings.reduce(
    (sum, booking) => sum + (Number(booking.total_amount) || 0),
    0,
  );
  const pendingBookings = bookingRows.filter(
    (booking) => booking.status === "pending",
  ).length;
  const publishedVenues = venueRows.filter(
    (venue) => venue.status === "published",
  ).length;
  const ratedVenues = venueRows.filter(
    (venue) => venue.review_count > 0 && venue.avg_rating > 0,
  );
  const avgRating =
    ratedVenues.length > 0
      ? ratedVenues.reduce((sum, venue) => sum + Number(venue.avg_rating), 0) /
        ratedVenues.length
      : null;

  const revenueByMonth = revenueBookings.reduce<Record<string, number>>(
    (months, booking) => {
      const label = monthLabel(booking.event_date);
      months[label] = (months[label] ?? 0) + (Number(booking.total_amount) || 0);
      return months;
    },
    {},
  );
  const monthRows = Object.entries(revenueByMonth).slice(0, 6);

  return (
    <DashboardSubPage
      title="Analytics"
      description="Track revenue, bookings, listing readiness, and venue reputation."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={formatPeso(totalRevenue)}
          icon="payments"
          highlight
        />
        <KpiCard
          label="Total Bookings"
          value={String(bookingRows.length)}
          icon="event_available"
        />
        <KpiCard
          label="Pending Requests"
          value={String(pendingBookings)}
          icon="pending_actions"
        />
        <KpiCard
          label="Avg. Rating"
          value={avgRating != null ? avgRating.toFixed(1) : "-"}
          icon="star"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelHeader
            title="Revenue Overview"
            description="Revenue from approved, confirmed, and completed bookings."
          />
          {monthRows.length > 0 ? (
            <div className="space-y-3">
              {monthRows.map(([label, amount]) => {
                const width =
                  totalRevenue > 0
                    ? Math.max(8, Math.round((amount / totalRevenue) * 100))
                    : 0;

                return (
                  <div key={label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#111827]">{label}</span>
                      <span className="font-bold text-[#1d4ed8]">
                        {formatPeso(amount)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
                      <div
                        className="h-full rounded-full bg-[#1d4ed8]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#e5e7eb] bg-[#f9fafb] px-6 py-12 text-center">
              <h3 className="font-display text-lg font-bold text-[#111827]">
                No revenue yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#4b5563]">
                Revenue analytics will appear once approved or completed bookings have a total amount.
              </p>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Listing Health"
            description="A quick view of venue readiness across your portfolio."
          />
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">
                Published Venues
              </p>
              <p className="mt-2 font-display text-3xl font-bold text-[#111827]">
                {publishedVenues}/{venueRows.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">
                Booking Status Mix
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["pending", "approved", "confirmed", "completed", "cancelled"].map(
                  (status) => {
                    const count = bookingRows.filter(
                      (booking) => booking.status === status,
                    ).length;
                    return count > 0 ? (
                      <StatusBadge
                        key={status}
                        status={status}
                        label={`${status.replace(/_/g, " ")}: ${count}`}
                      />
                    ) : null;
                  },
                )}
                {bookingRows.length === 0 ? (
                  <span className="text-sm text-[#6b7280]">No bookings yet.</span>
                ) : null}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </DashboardSubPage>
  );
}
