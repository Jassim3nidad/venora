import { CoordinatorOverview } from "@/components/dashboard/enterprise";

export const metadata = {
  title: "Event Coordinator Dashboard",
  description:
    "Manage venue listings, bookings, calendars, suppliers, and operational reports.",
};

export default function EventCoordinatorDashboardPage() {
  return <CoordinatorOverview />;
}
