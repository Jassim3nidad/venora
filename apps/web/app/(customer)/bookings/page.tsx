import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  Sparkles,
  TicketCheck,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Bookings | Venora",
};

export const dynamic = "force-dynamic";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "approved"
  | "declined"
  | "cancelled"
  | "completed"
  | string;

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
  status?: BookingStatus | null;
  event_date?: string | null;
  booking_date?: string | null;
  start_date?: string | null;
  created_at?: string | null;
  event_type?: string | null;
  guest_count?: number | null;
  total_amount?: number | null;
  estimated_total?: number | null;
  notes?: string | null;
  venues?: VenueRecord | VenueRecord[] | null;
};

const statusStyles: Record<
  string,
  {
    label: string;
    icon: typeof Clock3;
    className: string;
  }
> = {
  pending: {
    label: "Pending",
    icon: Clock3,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  declined: {
    label: "Declined",
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "Date not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not set";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value?: number | null) {
  if (!value || !Number.isFinite(value)) {
    return "Price pending";
  }

  return `₱${value.toLocaleString("en-PH")}`;
}

function getVenue(booking: BookingRecord) {
  if (Array.isArray(booking.venues)) {
    return booking.venues[0];
  }

  return booking.venues;
}

function getVenueLocation(venue?: VenueRecord | null) {
  if (!venue) return "Location unavailable";

  if (venue.city && venue.province) {
    return `${venue.city}, ${venue.province}`;
  }

  return venue.city || venue.province || "Location unavailable";
}

function buildVenueImageUrl(storagePath?: string | null) {
  if (!storagePath) {
    return "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80";
  }

  if (storagePath.startsWith("http")) {
    return storagePath;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80";
  }

  return `${supabaseUrl}/storage/v1/object/public/venue-images/${storagePath}`;
}

async function getCustomerBookings(userId: string) {
  const supabase = await createClient();

  const selectQuery = `
    *,
    venues (
      id,
      name,
      slug,
      city,
      province,
      venue_images (
        storage_path
      )
    )
  `;

  let { data, error } = await (supabase.from("bookings") as any)
    .select(selectQuery)
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    const fallback = await (supabase.from("bookings") as any)
      .select(selectQuery)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("[bookings/page] Supabase fetch error:", error.message);
    return [];
  }

  return (data ?? []) as BookingRecord[];
}

export default async function CustomerBookingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/bookings");
  }

  const bookings = await getCustomerBookings(user.id);

  const pendingCount = bookings.filter(
    (booking) => booking.status === "pending",
  ).length;

  const confirmedCount = bookings.filter((booking) =>
    ["confirmed", "approved"].includes(String(booking.status)),
  ).length;

  const completedCount = bookings.filter(
    (booking) => booking.status === "completed",
  ).length;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-[#2563EB]/15 blur-3xl" />
        <div className="absolute right-[-140px] top-[60px] h-[320px] w-[320px] rounded-full bg-[#37BCF1]/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/venues"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Venues
            </Link>

            <Link
              href="/account"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2 text-sm font-bold text-[#2563EB] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-white"
            >
              Account Settings
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
                <Sparkles className="h-3.5 w-3.5" />
                Venora booking center
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.05em] text-[#111827] sm:text-5xl">
                Track every venue booking request in one place.
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-[#6B7280] sm:text-base">
                Review pending requests, confirmed reservations, and completed
                venue bookings connected to your Venora account.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-xl shadow-slate-200/60">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
                    Total
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#111827]">
                    {bookings.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-amber-700">
                    Pending
                  </p>
                  <p className="mt-2 text-2xl font-black text-amber-800">
                    {pendingCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-700">
                    Active
                  </p>
                  <p className="mt-2 text-2xl font-black text-emerald-800">
                    {confirmedCount}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
                  Completed bookings
                </p>
                <p className="mt-1 text-xl font-black text-[#111827]">
                  {completedCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {bookings.length > 0 ? (
          <div className="grid gap-5">
            {bookings.map((booking) => {
              const venue = getVenue(booking);
              const statusKey = String(booking.status ?? "pending");
              const status = statusStyles[statusKey] ?? statusStyles.pending!;
              const StatusIcon = status.icon;

              const eventDate =
                booking.event_date ||
                booking.booking_date ||
                booking.start_date ||
                booking.created_at;

              const venueImage =
                venue?.venue_images?.[0]?.storage_path ?? undefined;

              return (
                <article
                  key={booking.id}
                  className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-xl shadow-slate-200/50"
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

                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div
                            className={[
                              "mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em]",
                              status.className,
                            ].join(" ")}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {status.label}
                          </div>

                          <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                            {venue?.name ?? "Untitled Venue"}
                          </h2>

                          <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-[#6B7280]">
                            <span className="inline-flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-[#2563EB]" />
                              {getVenueLocation(venue)}
                            </span>

                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-[#2563EB]" />
                              {formatDate(eventDate)}
                            </span>

                            {booking.guest_count ? (
                              <span className="inline-flex items-center gap-2">
                                <TicketCheck className="h-4 w-4 text-[#2563EB]" />
                                {booking.guest_count} guests
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 lg:text-right">
                          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
                            Estimated total
                          </p>
                          <p className="mt-1 text-lg font-black text-[#111827]">
                            {formatCurrency(
                              booking.total_amount ?? booking.estimated_total,
                            )}
                          </p>
                        </div>
                      </div>

                      {booking.event_type || booking.notes ? (
                        <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                          {booking.event_type ? (
                            <p className="text-sm font-bold text-[#111827]">
                              Event type:{" "}
                              <span className="font-semibold text-[#6B7280]">
                                {booking.event_type}
                              </span>
                            </p>
                          ) : null}

                          {booking.notes ? (
                            <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280]">
                              {booking.notes}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        {venue?.slug ? (
                          <Link
                            href={`/venues/${venue.slug}`}
                            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
                          >
                            View Venue
                          </Link>
                        ) : null}

                        <Link
                          href="/venues"
                          className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#111827] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                        >
                          Browse More Venues
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white p-8 text-center shadow-xl shadow-slate-200/60">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#EFF6FF] text-[#2563EB]">
              <Search className="h-7 w-7" />
            </div>

            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
              No bookings yet
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-[#111827]">
              Start with your first venue request.
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#6B7280]">
              Browse Venora&apos;s curated venues, choose the right space, and
              submit a booking request when you are ready.
            </p>

            <div className="mt-6 flex justify-center">
              <Link
                href="/venues"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563EB] px-6 text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8]"
              >
                Browse Venues
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}