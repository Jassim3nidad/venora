import type { Metadata } from "next";
import {
  DashButton,
  DashboardSubPage,
  EmptyState,
} from "@/components/dashboard/enterprise";
import BookingCalendar from "@/src/features/calendar/ui/BookingCalendar";
import {
  getOwnerDashboardContext,
  getOwnerVenueIds,
  requireCoordinatorPermission,
} from "@/lib/dashboard/org-dashboard-data";

export const metadata: Metadata = {
  title: "Event Calendar - Coordinator Dashboard",
};

export const dynamic = "force-dynamic";

type CalendarVenue = {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
};

export default async function CoordinatorCalendarPage() {
  const context = await getOwnerDashboardContext();
  requireCoordinatorPermission("view_assigned_calendars", context);
  const { supabase, isAdmin } = context;
  const venueIds = await getOwnerVenueIds(context);

  let venuesQuery = supabase
    .from("venues")
    .select("id, name, city, province")
    .order("name", { ascending: true });

  if (!isAdmin) venuesQuery = venuesQuery.in("id", venueIds);

  const { data: venues, error } =
    isAdmin || venueIds.length > 0
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
      description="Review and manage availability across the venues your organization coordinates."
      action={
        <DashButton
          href="/dashboard/coordinator/bookings"
          variant="secondary"
          icon="celebration"
        >
          View Events
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
          description="Venues assigned to your organization will appear here for availability management."
          action={
            <DashButton href="/dashboard/coordinator/venues" icon="location_city">
              View Venues
            </DashButton>
          }
        />
      ) : (
        <BookingCalendar venues={venueRows} />
      )}
    </DashboardSubPage>
  );
}
