import type { Metadata } from "next";
import {
  DashButton,
  DashboardSubPage,
  EmptyState,
} from "@/components/dashboard/enterprise";
import BookingCalendar from "@/src/features/calendar/ui/BookingCalendar";
import { getOwnerDashboardContext } from "../_lib/owner-dashboard-data";

export const metadata: Metadata = {
  title: "Booking Calendar - Venora Dashboard",
};

type CalendarVenue = {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
};

export default async function CalendarPage() {
  const { supabase, orgIds, isAdmin } = await getOwnerDashboardContext();

  let venuesQuery = supabase
    .from("venues")
    .select("id, name, city, province")
    .order("name", { ascending: true });

  if (!isAdmin) venuesQuery = venuesQuery.in("organization_id", orgIds);

  const { data: venues, error } =
    isAdmin || orgIds.length > 0
      ? await venuesQuery
      : { data: [], error: null };

  const venueRows = ((venues ?? []) as CalendarVenue[]).map((venue) => ({
    id: venue.id,
    name: venue.name,
    city: venue.city,
    province: venue.province,
  }));

  return (
    <DashboardSubPage
      title="Availability Calendar"
      description="Control which dates customers can request. Pending and booked dates from Venora bookings are shown automatically."
      action={
        <DashButton
          href="/dashboard/bookings"
          variant="secondary"
          icon="calendar_month"
        >
          View Bookings
        </DashButton>
      }
    >
      {error ? (
        <EmptyState
          icon="error"
          title="Calendar could not load"
          description="Please refresh the page or try again later."
        />
      ) : venueRows.length === 0 ? (
        <EmptyState
          icon="event"
          title="No venues yet"
          description="Add a venue first before managing availability."
          action={
            <DashButton href="/dashboard/venues/new" icon="add">
              Add Venue
            </DashButton>
          }
        />
      ) : (
        <BookingCalendar venues={venueRows} />
      )}
    </DashboardSubPage>
  );
}
