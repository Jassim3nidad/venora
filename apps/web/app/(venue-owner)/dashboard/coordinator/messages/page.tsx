import {
  getOwnerDashboardContext,
  requireCoordinatorPermission,
  getOwnerVenueIds,
} from "@/src/lib/dashboard/org-dashboard-data";
import { DashboardSubPage } from "@/src/components/dashboard/enterprise";
import {
  CoordinatorInboxClient,
  type InboxThread,
} from "./CoordinatorInboxClient";

export const metadata = {
  title: "Messages | Event Coordinator Dashboard",
};
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ thread?: string }>;

export default async function CoordinatorMessagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const context = await getOwnerDashboardContext();
  requireCoordinatorPermission("message_assigned_customers", context);

  const { supabase, user, isAdmin } = context;
  const assignedVenueIds = await getOwnerVenueIds(context);

  if (!isAdmin && assignedVenueIds.length === 0) {
    return (
      <DashboardSubPage
        title="Customer conversations"
        description="Booking chats and venue inquiries for your assigned venues."
      >
        <div className="rounded-[24px] border border-[#e5e7eb] bg-white p-6 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-medium text-[#475569]">
            You have not been assigned to any venues yet.
          </p>
        </div>
      </DashboardSubPage>
    );
  }

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      "id, event_date, status, venue_id, venues(name, slug), profiles!customer_id(full_name)",
    )
    .in("status", ["pending", "approved", "payment_pending", "confirmed"])
    .order("event_date", { ascending: false });

  if (!isAdmin) {
    bookingsQuery = bookingsQuery.in("venue_id", assignedVenueIds);
  }

  let inquiriesQuery = supabase
    .from("inquiries")
    .select(
      "id, status, created_at, venue_id, customer_id, message, venues(name, slug), profiles!customer_id(full_name)",
    )
    .in("status", ["new", "responded"])
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    inquiriesQuery = inquiriesQuery.in("venue_id", assignedVenueIds);
  }

  const [{ data: bookingsRaw }, { data: inquiriesRaw }] = await Promise.all([
    bookingsQuery,
    inquiriesQuery,
  ]);

  const bookings = (bookingsRaw || []) as any[];
  const inquiries = (inquiriesRaw || []) as any[];
  const bookingIds = bookings.map((b) => b.id as string);
  const inquiryIds = inquiries.map((i) => i.id as string);

  const [
    { data: bookingMessagesRaw, error: bookingMessagesError },
    { data: inquiryMessagesRaw, error: inquiryMessagesError },
    { data: unreadNotifications },
  ] = await Promise.all([
    bookingIds.length > 0
      ? supabase
          .from("booking_messages")
          .select("id, booking_id, sender_id, sender_role, message, created_at")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    inquiryIds.length > 0
      ? supabase
          .from("venue_inquiry_messages")
          .select("id, inquiry_id, sender_id, message, created_at")
          .in("inquiry_id", inquiryIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("notifications")
      .select("id, link, read_at")
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  if (bookingMessagesError) {
    console.error(
      "[coordinator/messages] booking_messages query failed:",
      bookingMessagesError.message,
    );
  }
  if (inquiryMessagesError) {
    console.error(
      "[coordinator/messages] venue_inquiry_messages query failed:",
      inquiryMessagesError.message,
    );
  }

  const senderIds = Array.from(
    new Set([
      ...((bookingMessagesRaw || []) as any[]).map((msg) => msg.sender_id),
      ...((inquiryMessagesRaw || []) as any[]).map((msg) => msg.sender_id),
    ]),
  );

  const { data: senderProfiles } =
    senderIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", senderIds)
      : { data: [] };

  const senderNameById = new Map(
    ((senderProfiles || []) as Array<{ id: string; full_name: string | null }>).map(
      (profile) => [profile.id, profile.full_name],
    ),
  );

  const latestBookingMessageMap = new Map<
    string,
    NonNullable<InboxThread["latestMessage"]>
  >();
  for (const msg of (bookingMessagesRaw || []) as any[]) {
    if (!latestBookingMessageMap.has(msg.booking_id)) {
      latestBookingMessageMap.set(msg.booking_id, {
        message: msg.message,
        created_at: msg.created_at,
        sender_role: msg.sender_role === "customer" ? "customer" : "venue_team",
        sender_name: senderNameById.get(msg.sender_id) || null,
      });
    }
  }

  const latestInquiryMessageMap = new Map<
    string,
    NonNullable<InboxThread["latestMessage"]>
  >();
  for (const msg of (inquiryMessagesRaw || []) as any[]) {
    if (!latestInquiryMessageMap.has(msg.inquiry_id)) {
      const inquiry = inquiries.find((row) => row.id === msg.inquiry_id);
      latestInquiryMessageMap.set(msg.inquiry_id, {
        message: msg.message,
        created_at: msg.created_at,
        sender_role:
          inquiry && msg.sender_id === inquiry.customer_id
            ? "customer"
            : "venue_team",
        sender_name: senderNameById.get(msg.sender_id) || null,
      });
    }
  }

  const unreadLinks = new Set(
    ((unreadNotifications ?? []) as Array<{ link: string | null }>)
      .map((n) => n.link)
      .filter((link): link is string => Boolean(link)),
  );

  const bookingThreads: InboxThread[] = bookings
    .map((b) => {
      const venue = Array.isArray(b.venues) ? b.venues[0] : b.venues;
      const latestMessage = latestBookingMessageMap.get(b.id);
      // Keep pending bookings visible even before first message; keep any
      // booking that already has chat activity (including confirmed).
      const hasActivity =
        Boolean(latestMessage) ||
        b.status === "pending" ||
        b.status === "approved" ||
        b.status === "payment_pending";
      if (!hasActivity) return null;

      return {
        key: `booking:${b.id}`,
        kind: "booking" as const,
        id: b.id,
        customerName: b.profiles?.full_name || "Unknown Customer",
        venueName: venue?.name || "Unknown Venue",
        venueSlug: venue?.slug,
        eventDate: b.event_date,
        status: b.status,
        latestMessage,
        needsReply: latestMessage?.sender_role === "customer",
        isUnread:
          unreadLinks.has(`/dashboard/coordinator/bookings/${b.id}`) ||
          unreadLinks.has(
            `/dashboard/coordinator/messages?thread=booking:${b.id}`,
          ),
      };
    })
    .filter(Boolean) as InboxThread[];

  const inquiryThreads: InboxThread[] = inquiries.map((inquiry) => {
    const venue = Array.isArray(inquiry.venues)
      ? inquiry.venues[0]
      : inquiry.venues;
    const latestMessage =
      latestInquiryMessageMap.get(inquiry.id) ??
      (inquiry.message
        ? {
            message: inquiry.message as string,
            created_at: inquiry.created_at as string,
            sender_role: "customer" as const,
            sender_name: (inquiry.profiles?.full_name as string | null) || null,
          }
        : undefined);

    return {
      key: `inquiry:${inquiry.id}`,
      kind: "inquiry" as const,
      id: inquiry.id,
      customerName: inquiry.profiles?.full_name || "Unknown Customer",
      venueName: venue?.name || "Unknown Venue",
      venueSlug: venue?.slug,
      eventDate: inquiry.created_at,
      status: inquiry.status,
      latestMessage,
      needsReply:
        latestMessage?.sender_role === "customer" || inquiry.status === "new",
      isUnread: unreadLinks.has(
        `/dashboard/coordinator/messages?thread=inquiry:${inquiry.id}`,
      ),
    };
  });

  const threads = [...bookingThreads, ...inquiryThreads];

  return (
    <DashboardSubPage
      title="Customer conversations"
      description="Booking chats and venue inquiries for your assigned venues."
    >
      <CoordinatorInboxClient
        threads={threads}
        currentUserId={user.id}
        initialThreadKey={params.thread ?? null}
      />
    </DashboardSubPage>
  );
}
