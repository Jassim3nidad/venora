import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  MapPin,
  Search,
  Sparkles,
  Star,
  TicketCheck,
} from "lucide-react";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import {
  CustomerCard,
  CustomerEmptyState,
  CustomerLinkButton,
  CustomerPageHeader,
} from "@/src/components/customer/CustomerUI";
import { createClient } from "@/lib/supabase/server";
import { getNavbarProfile } from "@/lib/get-navbar-profile";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABEL,
  type BookingStatusValue,
} from "@/src/features/booking/domain/value-objects/booking-status.vo";
import { BookingStatusBadge } from "@/src/features/booking/ui/booking-status-badge";

export const metadata: Metadata = {
  title: "My Bookings | Venora",
};

export const dynamic = "force-dynamic";

type VenueRecord = {
  id?: string;
  name?: string | null;
  slug?: string | null;
  city?: string | null;
  province?: string | null;
  venue_images?: { storage_path?: string | null }[] | null;
};

type BookingRecord = {
  id: string;
  status: BookingStatusValue;
  event_date: string | null;
  guest_count: number | null;
  total_amount: number | null;
  deposit_amount: number | null;
  payment_due_at: string | null;
  created_at: string | null;
  venues?: VenueRecord | VenueRecord[] | null;
  reviews?: { id: string }[] | null;
};

const knownBookingStatuses = new Set<string>(BOOKING_STATUSES);

function toBookingStatus(status?: string | null): BookingStatusValue {
  return knownBookingStatuses.has(String(status))
    ? (status as BookingStatusValue)
    : "pending";
}

function formatDate(value?: string | null) {
  if (!value) return "Date not set";

  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return "Date not set";

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "Pending quote";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function getVenue(booking: BookingRecord) {
  if (Array.isArray(booking.venues)) return booking.venues[0];
  return booking.venues;
}

function getVenueLocation(venue?: VenueRecord | null) {
  if (!venue) return "Location unavailable";
  if (venue.city && venue.province) return `${venue.city}, ${venue.province}`;
  return venue.city || venue.province || "Location unavailable";
}

function buildVenueImageUrl(storagePath?: string | null) {
  if (!storagePath) {
    return "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80";
  }

  if (storagePath.startsWith("http")) return storagePath;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80";
  }

  return `${supabaseUrl}/storage/v1/object/public/venue-images/${storagePath}`;
}

function actionForBooking(booking: BookingRecord) {
  if (booking.status === "approved" || booking.status === "payment_pending") {
    return (
      <CustomerLinkButton href={`/bookings/${booking.id}/payment`}>
        <CreditCard className="h-4 w-4" />
        Pay Deposit
      </CustomerLinkButton>
    );
  }

  if (booking.status === "confirmed") {
    return (
      <CustomerLinkButton href={`/bookings/${booking.id}/confirmation`}>
        <CheckCircle2 className="h-4 w-4" />
        View Confirmation
      </CustomerLinkButton>
    );
  }

  if (booking.status === "completed" && !booking.reviews?.length) {
    return (
      <CustomerLinkButton href={`/bookings/${booking.id}/review`}>
        <Star className="h-4 w-4" />
        Review Venue
      </CustomerLinkButton>
    );
  }

  return (
    <CustomerLinkButton href={`/bookings/${booking.id}`} tone="secondary">
      View Details
    </CustomerLinkButton>
  );
}

async function getCustomerBookings(userId: string) {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
        id,
        status,
        event_date,
        guest_count,
        total_amount,
        deposit_amount,
        payment_due_at,
        created_at,
        venues (
          id,
          name,
          slug,
          city,
          province,
          venue_images (
            storage_path
          )
        ),
        reviews (
          id
        )
      `,
    )
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[bookings/page] Supabase fetch error:", error.message);
    return [];
  }

  return ((data ?? []) as Array<Omit<BookingRecord, "status"> & { status?: string | null }>).map(
    (booking) => ({
      ...booking,
      status: toBookingStatus(booking.status),
    }),
  );
}

export default async function CustomerBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/bookings");
  }

  const profile = await getNavbarProfile(supabase, user.id);
  const bookings = await getCustomerBookings(user.id);

  const pendingCount = bookings.filter(
    (booking) => booking.status === "pending",
  ).length;
  const paymentDueCount = bookings.filter((booking) =>
    ["approved", "payment_pending"].includes(booking.status),
  ).length;
  const confirmedCount = bookings.filter(
    (booking) => booking.status === "confirmed",
  ).length;
  const reviewCount = bookings.filter((booking) =>
    ["completed", "reviewed"].includes(booking.status),
  ).length;

  const stats = [
    { label: "Total bookings", value: bookings.length },
    { label: "Pending review", value: pendingCount },
    { label: "Payment due", value: paymentDueCount },
    { label: "Confirmed", value: confirmedCount },
    { label: "Completed", value: reviewCount },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <CustomerNavbar user={user} profile={profile} />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {query.created ? (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm"
          >
            Booking request submitted. The venue team can now review it.
          </div>
        ) : null}

        <CustomerPageHeader
          eyebrow="Booking center"
          icon={Sparkles}
          title="Track every booking request."
          description="Follow each venue from inquiry to approval, deposit payment, confirmation, completion, and review."
          action={
            <CustomerLinkButton href="/venues" tone="secondary">
              <Search className="h-4 w-4" />
              Browse Venues
            </CustomerLinkButton>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map(({ label, value }) => (
            <CustomerCard key={label} className="p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#6B7280]">
                {label}
              </p>
              <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#111827]">
                {value}
              </p>
            </CustomerCard>
          ))}
        </div>

        {bookings.length === 0 ? (
          <CustomerEmptyState
            icon={TicketCheck}
            eyebrow="No bookings yet"
            title="Start with your first venue inquiry."
            description="Browse curated Venora spaces and send your event details when a venue feels right."
            action={
              <CustomerLinkButton href="/venues">Browse Venues</CustomerLinkButton>
            }
          />
        ) : (
          <div className="grid gap-5">
            {bookings.map((booking) => {
              const venue = getVenue(booking);
              const venueImage = venue?.venue_images?.[0]?.storage_path;
              const quote =
                booking.status === "approved"
                  ? booking.deposit_amount
                  : booking.total_amount;

              return (
                <article
                  key={booking.id}
                  className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70"
                >
                  <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="relative h-56 overflow-hidden bg-[#EFF6FF] lg:h-full">
                      <img
                        src={buildVenueImageUrl(venueImage)}
                        alt={venue?.name ?? "Venue booking"}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent lg:bg-gradient-to-r" />
                    </div>

                    <div className="grid gap-5 p-5 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <BookingStatusBadge status={booking.status} />
                          <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#111827]">
                            {venue?.name ?? "Untitled Venue"}
                          </h2>

                          <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-[#6B7280]">
                            <span className="inline-flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-[#2563EB]" />
                              {getVenueLocation(venue)}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-[#2563EB]" />
                              {formatDate(booking.event_date)}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <TicketCheck className="h-4 w-4 text-[#2563EB]" />
                              {(booking.guest_count ?? 0).toLocaleString("en-PH")} guests
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 lg:text-right">
                          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
                            {booking.status === "approved" ? "Deposit due" : "Quote"}
                          </p>
                          <p className="mt-1 text-lg font-black text-[#111827]">
                            {formatCurrency(quote)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {actionForBooking(booking)}
                        {venue?.slug ? (
                          <Link
                            href={`/venues/${venue.slug}`}
                            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#111827] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                          >
                            View Venue
                          </Link>
                        ) : null}
                      </div>

                      <p className="text-xs font-semibold text-slate-400">
                        Current status: {BOOKING_STATUS_LABEL[booking.status]}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
