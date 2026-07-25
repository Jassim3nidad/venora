import {
  getOwnerDashboardContext,
  requireCoordinatorPermission,
  getOwnerVenueIds,
} from "@/src/lib/dashboard/org-dashboard-data";
import { DashboardSubPage } from "@/src/components/dashboard/enterprise";
import { CoordinatorInboxClient } from "./CoordinatorInboxClient";
import type { InboxThread } from "./CoordinatorInboxClient";

export const metadata = {
  title: "Messages | Event Coordinator Dashboard",
};
export const dynamic = "force-dynamic";

export default async function CoordinatorMessagesPage() {
  const context = await getOwnerDashboardContext();
  requireCoordinatorPermission("message_assigned_customers", context);

  const { supabase, user, isAdmin } = context;
  const assignedVenueIds = await getOwnerVenueIds(context);

  if (!isAdmin && assignedVenueIds.length === 0) {
    return (
      <DashboardSubPage title="Messages">
        <div className="rounded-[24px] border border-[#e5e7eb] bg-white p-6 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-medium text-[#475569]">
            You have not been assigned to any venues yet.
          </p>
        </div>
      </DashboardSubPage>
    );
  }

  // 1. Fetch active bookings for these venues
  let query = supabase
    .from("bookings")
    .select("id, event_date, status, venue_id, venues(name, slug, venue_packages(name)), profiles!customer_id(full_name)")
    .in("status", ["pending", "approved", "payment_pending", "confirmed"])
    .order("event_date", { ascending: false });
    
  if (!isAdmin) {
    query = query.in("venue_id", assignedVenueIds);
  }

  const { data: bookingsRaw } = await query;
  const bookings = bookingsRaw || [];

  if (bookings.length === 0) {
    return (
      <DashboardSubPage title="Messages">
        <CoordinatorInboxClient threads={[]} currentUserId={user.id} />
      </DashboardSubPage>
    );
  }

  const bookingIds = bookings.map((b: any) => b.id);

  // 2. Fetch the latest message for each booking
  const { data: latestMessagesRaw } = await supabase
    .from("booking_messages")
    .select("id, booking_id, sender_id, sender_role, message, created_at, profiles!sender_id(full_name)")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false });

  const latestMessages = latestMessagesRaw || [];
  
  // Create a map of booking_id -> latest message
  const latestMessageMap = new Map();
  for (const msg of latestMessages) {
    if (!latestMessageMap.has(msg.booking_id)) {
      latestMessageMap.set(msg.booking_id, {
        message: msg.message,
        created_at: msg.created_at,
        sender_role: msg.sender_role,
        sender_name: msg.profiles?.full_name || null,
      });
    }
  }

  // 3. Format threads
  const threads: InboxThread[] = bookings.map((b: any) => {
    // b.venues is an object or array. Usually object because it's a many-to-one relation.
    const venue = Array.isArray(b.venues) ? b.venues[0] : b.venues;
    const packageInfo = venue?.venue_packages;
    const pkg = Array.isArray(packageInfo) ? packageInfo[0] : packageInfo;
    
    return {
      id: b.id,
      customerName: b.profiles?.full_name || "Unknown Customer",
      venueName: venue?.name || "Unknown Venue",
      venueSlug: venue?.slug,
      serviceName: pkg?.name,
      eventDate: b.event_date,
      status: b.status,
      latestMessage: latestMessageMap.get(b.id),
    };
  });

  return (
    <DashboardSubPage title="Messages">
      <div className="-mx-4 -my-4 sm:-mx-6 lg:-mx-8">
        <CoordinatorInboxClient threads={threads} currentUserId={user.id} />
      </div>
    </DashboardSubPage>
  );
}
