import type { Metadata } from "next";
import {
  DashButton,
  DashboardSubPage,
  EmptyState,
} from "@/components/dashboard/enterprise";
import BookingCalendar from "@/src/features/calendar/ui/BookingCalendar";
import { getOwnerDashboardContext } from "@/lib/dashboard/org-dashboard-data";

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
      description="View the schedule of events for the venues you coordinate."
      action={
        <DashButton
          href="/dashboard/coordinator/events"
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
          title="No assigned venues"
          description="Your organization has not assigned any venues to coordinate."
        />
      ) : (
        <BookingCalendar venues={venueRows} />
      )}
    </DashboardSubPage>
  );
}
