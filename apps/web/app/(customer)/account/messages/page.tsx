import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { CustomerInboxClient, type CustomerInboxThread } from "./CustomerInboxClient";
import { AccountNav } from "../_components/AccountNav";
import { AccountMobileMenu } from "../_components/AccountMobileMenu";

export const metadata = {
  title: "Messages | Venora",
};

export const dynamic = "force-dynamic";

export default async function CustomerMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 1. Fetch Bookings
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, event_date, status, venues(name, slug, venue_packages(name))")
    .eq("customer_id", user.id);

  // 2. Fetch Venue Inquiries
  const { data: venueInquiriesRaw } = await supabase
    .from("inquiries")
    .select("id, status, created_at, venues(name, slug)")
    .eq("customer_id", user.id);

  // 3. Fetch Supplier Inquiries
  const { data: supplierInquiriesRaw } = await supabase
    .from("supplier_contact_requests")
    .select("id, status, event_date, supplier_services(name), supplier_profiles(business_name, slug)")
    .eq("customer_id", user.id);

  // Now fetch latest messages for each
  const bookingIds = (bookingsRaw || []).map(b => b.id);
  let latestBookingMessages = [];
  if (bookingIds.length > 0) {
    const { data } = await supabase
      .from("booking_messages")
      .select("booking_id, message, created_at, sender_role")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false });
    latestBookingMessages = data || [];
  }

  const venueInquiryIds = (venueInquiriesRaw || []).map(i => i.id);
  let latestVenueInquiryMessages = [];
  if (venueInquiryIds.length > 0) {
    const { data } = await supabase
      .from("venue_inquiry_messages")
      .select("inquiry_id, message, created_at, sender_role")
      .in("inquiry_id", venueInquiryIds)
      .order("created_at", { ascending: false });
    latestVenueInquiryMessages = data || [];
  }

  const supplierInquiryIds = (supplierInquiriesRaw || []).map(i => i.id);
  let latestSupplierInquiryMessages = [];
  if (supplierInquiryIds.length > 0) {
    const { data } = await supabase
      .from("supplier_inquiry_messages")
      .select("inquiry_id, message, created_at, sender_id")
      .in("inquiry_id", supplierInquiryIds)
      .order("created_at", { ascending: false });
    latestSupplierInquiryMessages = data || [];
  }

  const threads: CustomerInboxThread[] = [];

  for (const b of bookingsRaw || []) {
    const venue = Array.isArray(b.venues) ? b.venues[0] : b.venues;
    const pkg = Array.isArray(venue?.venue_packages) ? venue?.venue_packages[0] : venue?.venue_packages;
    const latestMsg = latestBookingMessages.find(m => m.booking_id === b.id);
    
    threads.push({
      id: b.id,
      kind: "booking",
      partnerName: venue?.name || "Unknown Venue",
      partnerSlug: venue?.slug,
      serviceName: pkg?.name,
      eventDate: b.event_date,
      status: b.status,
      latestMessage: latestMsg ? {
        message: latestMsg.message,
        created_at: latestMsg.created_at,
        sender_role: latestMsg.sender_role,
      } : undefined,
    });
  }

  for (const i of venueInquiriesRaw || []) {
    const venue = Array.isArray(i.venues) ? i.venues[0] : i.venues;
    const latestMsg = latestVenueInquiryMessages.find(m => m.inquiry_id === i.id);
    
    threads.push({
      id: i.id,
      kind: "venue_inquiry",
      partnerName: venue?.name || "Unknown Venue",
      partnerSlug: venue?.slug,
      serviceName: "General Inquiry",
      eventDate: i.created_at,
      status: i.status,
      latestMessage: latestMsg ? {
        message: latestMsg.message,
        created_at: latestMsg.created_at,
        sender_role: latestMsg.sender_role,
      } : undefined,
    });
  }

  for (const s of supplierInquiriesRaw || []) {
    const profile = Array.isArray(s.supplier_profiles) ? s.supplier_profiles[0] : s.supplier_profiles;
    const service = Array.isArray(s.supplier_services) ? s.supplier_services[0] : s.supplier_services;
    const latestMsg = latestSupplierInquiryMessages.find(m => m.inquiry_id === s.id);
    
    threads.push({
      id: s.id,
      kind: "supplier_inquiry",
      partnerName: profile?.business_name || "Unknown Supplier",
      partnerSlug: profile?.slug,
      serviceName: service?.name,
      eventDate: s.event_date,
      status: s.status,
      latestMessage: latestMsg ? {
        message: latestMsg.message,
        created_at: latestMsg.created_at,
        sender_role: latestMsg.sender_id === user.id ? "customer" : "partner",
      } : undefined,
    });
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-[#f8fafc]">
      <div className="hidden lg:block w-64 shrink-0 border-r border-[#e5e7eb] bg-white p-6">
        <AccountNav />
      </div>
      <div className="lg:hidden border-b border-[#e5e7eb] bg-white">
        <AccountMobileMenu />
      </div>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-hidden h-[calc(100vh-64px)]">
        <CustomerInboxClient threads={threads} currentUserId={user.id} />
      </div>
    </div>
  );
}
