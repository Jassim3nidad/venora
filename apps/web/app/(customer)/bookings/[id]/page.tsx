import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Star,
  Users,
  Compass,
  Check,
  FileText,
  AlertCircle,
  ParkingCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Badge, Separator, Button } from "@venora/ui";
import { CustomerStatusBadge } from "@/src/components/customer/CustomerUI";
import { createClient } from "@/lib/supabase/server";
import { BookingStatusBadge } from "@/src/features/booking/ui/booking-status-badge";
import { CustomerCancelBookingButton } from "@/src/features/booking/ui/booking-action-controls";
import {
  canCancelBookingStatus,
  type BookingStatusValue,
} from "@/src/features/booking/domain/value-objects/booking-status.vo";
import { getBookingMessages } from "@/src/features/booking/application/messages-actions";
import { BookingConversation } from "@/src/features/booking/ui/BookingConversation";
import VenueGallery from "@/src/features/venues/ui/VenueGallery";
import { pickGalleryImages } from "@/src/features/venues/utils/venue-media";
import { resolveVenueMapCoordinates } from "@/src/lib/venue-map-coordinates";

import { BookingVenueMap } from "@/src/features/booking/ui/BookingVenueMap";

export const metadata: Metadata = {
  title: "Booking Details | Venora",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

type BookingDetail = {
  id: string;
  customer_id: string;
  status: BookingStatusValue;
  event_date: string;
  event_start_time: string | null;
  event_end_time: string | null;
  guest_count: number;
  total_amount: number | null;
  deposit_amount: number | null;
  special_requests: string | null;
  payment_due_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  venues: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    province: string | null;
    description: string | null;
    capacity_max: number | null;
    indoor_outdoor: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    parking_available: boolean | null;
    wheelchair_accessible: boolean | null;
    overnight_accommodation: boolean | null;
    pet_friendly: boolean | null;
    venue_rules: string | null;
    cancellation_policy: string | null;
    venue_images: any[] | null;
    venue_amenities: Array<{
      amenities: { name: string } | null;
    }> | null;
  } | null;
  venue_packages: {
    name: string;
    price: number;
    price_unit: string;
    description: string | null;
    inclusions: any | null;
  } | null;
  transactions: Array<{
    id: string;
    amount: number;
    payment_provider: string;
    provider_reference: string | null;
    status: string;
    created_at: string;
    paid_at: string | null;
  }> | null;
  booking_status_history: Array<{
    status: BookingStatusValue;
    note: string | null;
    created_at: string;
  }> | null;
  reviews: Array<{
    id: string;
    overall_rating: number;
    comment: string | null;
  }> | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date);
}

function formatCurrency(value?: number | null) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "Pending quote";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function locationLabel(venue: BookingDetail["venues"]) {
  if (!venue) return "Location unavailable";
  if (venue.city && venue.province) return `${venue.city}, ${venue.province}`;
  return venue.city || venue.province || "Location unavailable";
}

function getVenueResponse(booking: BookingDetail) {
  const statusHistory = booking.booking_status_history ?? [];

  const latestResponse = statusHistory
    .filter((item) =>
      [
        "approved",
        "confirmed",
        "declined",
        "cancelled",
        "rejected",
        "payment_pending",
      ].includes(item.status),
    )
    .filter((item) => item.note)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];

  return latestResponse?.note ?? "Awaiting venue response.";
}

function nextAction(booking: BookingDetail) {
  if (booking.status === "approved" || booking.status === "payment_pending") {
    return (
      <Link
        href={`/bookings/${booking.id}/payment`}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
      >
        <CreditCard className="h-4 w-4" />
        Pay Deposit
      </Link>
    );
  }

  if (booking.status === "confirmed") {
    return (
      <Link
        href={`/bookings/${booking.id}/confirmation`}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
      >
        <CheckCircle2 className="h-4 w-4" />
        View Confirmation
      </Link>
    );
  }

  if (booking.status === "completed" && !booking.reviews?.length) {
    return (
      <Link
        href={`/bookings/${booking.id}/review`}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
      >
        <Star className="h-4 w-4" />
        Review Venue
      </Link>
    );
  }

  if (booking.reviews?.length || booking.status === "reviewed") {
    return (
      <Link
        href={`/bookings/${booking.id}/review`}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#93C5FD] bg-white px-5 text-sm font-bold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
      >
        <Star className="h-4 w-4" />
        View Review
      </Link>
    );
  }

  return null;
}

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirectTo=/bookings/${id}`);

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      customer_id,
      status,
      event_date,
      event_start_time,
      event_end_time,
      guest_count,
      total_amount,
      deposit_amount,
      special_requests,
      payment_due_at,
      confirmed_at,
      completed_at,
      reviewed_at,
      venues (
        id,
        name,
        slug,
        city,
        province,
        description,
        capacity_max,
        indoor_outdoor,
        address,
        latitude,
        longitude,
        parking_available,
        wheelchair_accessible,
        overnight_accommodation,
        pet_friendly,
        venue_rules,
        cancellation_policy,
        venue_images (*),
        venue_amenities (
          amenities (
            name
          )
        )
      ),
      venue_packages (
        name,
        price,
        price_unit,
        description,
        inclusions
      ),
      transactions (
        id,
        amount,
        payment_provider,
        provider_reference,
        status,
        created_at,
        paid_at
      ),
      booking_status_history (
        status,
        note,
        created_at
      ),
      reviews (
        id,
        overall_rating,
        comment
      )
    `,
    )
    .eq("id", id)
    .eq("customer_id", user.id)
    .single();

  if (error || !booking) {
    notFound();
  }

  const typedBooking = booking as BookingDetail;
  const canCancel = canCancelBookingStatus(typedBooking.status);

  // Messaging is allowed for active statuses
  const MESSAGING_ALLOWED = new Set([
    "pending",
    "approved",
    "payment_pending",
    "confirmed",
  ]);
  const isReadOnly = !MESSAGING_ALLOWED.has(typedBooking.status);

  const messages = await getBookingMessages(id);
  const galleryImages = pickGalleryImages(
    typedBooking.venues?.venue_images ?? [],
  );

  const mapLocation = typedBooking.venues
    ? await resolveVenueMapCoordinates({
        address: typedBooking.venues.address,
        city: typedBooking.venues.city,
        province: typedBooking.venues.province,
        latitude: typedBooking.venues.latitude,
        longitude: typedBooking.venues.longitude,
      })
    : null;

  const mapLatitude = mapLocation?.latitude ?? typedBooking.venues?.latitude;
  const mapLongitude = mapLocation?.longitude ?? typedBooking.venues?.longitude;
  const hasMap =
    mapLatitude != null &&
    mapLongitude != null &&
    Number.isFinite(Number(mapLatitude)) &&
    Number.isFinite(Number(mapLongitude));

  const amenitiesList =
    typedBooking.venues?.venue_amenities
      ?.map((va: any) => va.amenities?.name)
      .filter(Boolean) ?? [];

  const rulesList = String(typedBooking.venues?.venue_rules ?? "")
    .split(/\r?\n/)
    .map((rule) => rule.trim())
    .filter(Boolean);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 pb-28 pt-6 font-sans sm:px-6 sm:pt-8 lg:px-8 lg:pb-8">
      <Link
        href="/bookings"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to bookings
      </Link>

      {/* Top Header info */}
      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <BookingStatusBadge status={typedBooking.status} />
              {typedBooking.venues?.indoor_outdoor && (
                <Badge
                  variant="outline"
                  className="border-[#DBEAFE] bg-[#EFF6FF] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2563EB]"
                >
                  {typedBooking.venues?.indoor_outdoor}
                </Badge>
              )}
              <span className="text-xs font-semibold text-slate-400">
                Ref: {typedBooking.id.split("-")[0]?.toUpperCase() ?? "N/A"}
              </span>
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-[-0.04em] text-slate-950 md:text-4xl">
              {typedBooking.venues?.name ?? "Venue Booking"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-[#6B7280]">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#2563EB]" />
                {locationLabel(typedBooking.venues)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#2563EB]" />
                {typedBooking.guest_count.toLocaleString("en-PH")} guests
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            {typedBooking.venues?.slug && (
              <Link
                href={`/venues/${typedBooking.venues.slug}`}
                className="flex h-11 items-center gap-2 rounded-2xl border border-[#E5E7EB] px-4 text-sm font-bold text-[#111827] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                View Public Venue
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <VenueGallery
        media={galleryImages}
        venueName={typedBooking.venues?.name ?? "Venue"}
      />

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-10 lg:col-span-2">
          {/* Booking Overview Grid */}
          <section className="space-y-4">
            <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Event Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <CustomerStatusBadge icon={CalendarDays}>
                  Event Date
                </CustomerStatusBadge>
                <p className="mt-3 text-lg font-black text-slate-950">
                  {formatDate(typedBooking.event_date)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {typedBooking.event_start_time || "Start time pending"} -{" "}
                  {typedBooking.event_end_time || "End time pending"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <CustomerStatusBadge icon={Users}>Guests</CustomerStatusBadge>
                <p className="mt-3 text-lg font-black text-slate-950">
                  {typedBooking.guest_count.toLocaleString("en-PH")}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Total attendees expected
                </p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Selected Package */}
          <section className="space-y-4">
            <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Selected Package
            </h3>
            {typedBooking.venue_packages ? (
              <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-black tracking-[-0.02em] text-[#1D4ED8]">
                      {typedBooking.venue_packages.name}
                    </h4>
                    {typedBooking.venue_packages.description && (
                      <p className="mt-2 text-sm font-medium leading-relaxed text-[#1E40AF]">
                        {typedBooking.venue_packages.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-lg font-black text-[#1E3A8A]">
                      {formatCurrency(typedBooking.total_amount)}
                    </p>
                    <p className="text-xs font-semibold text-[#3B82F6]">
                      Booked total price
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Custom Venue Request
                    </h4>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      No specific package was selected during inquiry.
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-lg font-black text-slate-900">
                      {formatCurrency(typedBooking.total_amount)}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      Booked total price
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <Separator />

          {/* About Section */}
          {typedBooking.venues?.description && (
            <>
              <section className="space-y-4">
                <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  About the Venue
                </h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">
                  {typedBooking.venues.description}
                </p>
              </section>

              <Separator />
            </>
          )}

          {/* Amenities grid */}
          <section className="space-y-4">
            <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Amenities & Features
            </h3>
            {amenitiesList.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {amenitiesList.map((amenity: string) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5 text-sm font-medium text-[var(--text-secondary)]"
                  >
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 text-sm font-medium text-[var(--text-secondary)]">
                Amenities have not been added for this venue yet.
              </div>
            )}
          </section>

          <Separator />

          {/* Parking, Rules, and Policies */}
          <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                <ParkingCircle className="h-4.5 w-4.5 text-[var(--color-brand-600)]" />
                Parking & Accessibility
              </span>
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-medium leading-6 text-[#6B7280]">
                <div className="flex gap-3">
                  {typedBooking.venues?.parking_available ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <p>
                    {typedBooking.venues?.parking_available
                      ? "Secure on-site private parking is available for all guests and coordinators."
                      : "Private on-site parking is not available. Street parking or public pay lots are nearby."}
                  </p>
                </div>

                {typedBooking.venues?.wheelchair_accessible && (
                  <div className="mt-3 flex gap-3 border-t border-[#E5E7EB] pt-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>
                      Accessible routes and ramps are fully prepared on-site.
                    </p>
                  </div>
                )}
                {typedBooking.venues?.overnight_accommodation && (
                  <div className="mt-3 flex gap-3 border-t border-[#E5E7EB] pt-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>Overnight accommodation is available.</p>
                  </div>
                )}
                {typedBooking.venues?.pet_friendly && (
                  <div className="mt-3 flex gap-3 border-t border-[#E5E7EB] pt-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>Pet-friendly arrangements are supported.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                <Clock className="h-4.5 w-4.5 text-[var(--color-brand-600)]" />
                Venue Rules
              </span>
              {rulesList.length > 0 ? (
                <ul className="space-y-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4">
                  {rulesList.map((rule) => (
                    <li
                      key={rule}
                      className="flex gap-2 text-xs leading-relaxed text-[var(--text-secondary)]"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2563EB]" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  Standard booking policies apply. Respect operating hours,
                  maximum guest capacity constraints, and municipal noise
                  ordinances.
                </p>
              )}
            </div>
          </section>

          <Separator />

          {/* Location / Map Section */}
          <section className="space-y-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Location & Accessibility
              </h3>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                <MapPin className="h-3.5 w-3.5 text-[#2563EB]" />
                {typedBooking.venues?.address}, {typedBooking.venues?.city}
              </span>
            </div>
            {!hasMap ? (
              <div className="flex h-[300px] flex-col items-center justify-center rounded-3xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 text-center">
                <Compass className="mb-2 h-8 w-8 text-[var(--text-muted)]" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Map details unavailable
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <BookingVenueMap
                  latitude={Number(mapLatitude)}
                  longitude={Number(mapLongitude)}
                  zoom={mapLocation?.zoom ?? 14}
                  markerLabel={typedBooking.venues?.name ?? "Venue"}
                />
              </div>
            )}
          </section>

          <Separator />

          {/* Notes and Request */}
          <section className="space-y-4">
            <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Your Request & Notes
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                  Your inquiry
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  {typedBooking.special_requests || "No notes added."}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                  Venue response
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  {getVenueResponse(typedBooking)}
                </p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Status timeline */}
          <section className="space-y-4">
            <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Status Timeline
            </h3>

            <div className="grid gap-0">
              {(typedBooking.booking_status_history ?? []).length > 0 ? (
                typedBooking.booking_status_history?.map((item) => (
                  <div
                    key={`${item.status}-${item.created_at}`}
                    className="flex gap-4 border-l-2 border-[#DBEAFE] pb-6 last:border-transparent last:pb-0"
                  >
                    <span className="-ml-[13px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#2563EB] text-white">
                      <Clock3 className="h-3 w-3" />
                    </span>

                    <div className="-mt-1.5">
                      <p className="text-sm font-black capitalize text-slate-950">
                        {item.status.replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        {formatDate(item.created_at)}
                      </p>
                      {item.note ? (
                        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-600">
                          {item.note}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-semibold text-slate-500">
                  No status updates yet.
                </p>
              )}
            </div>
          </section>

          <Separator />

          {/* Booking Conversation */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Chat with the Venue Owner
              </h3>
              {isReadOnly && (
                <span className="rounded-full border border-[#E5E7EB] bg-[#F3F4F6] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#6B7280]">
                  Read-only
                </span>
              )}
            </div>
            <BookingConversation
              bookingId={typedBooking.id}
              initialMessages={messages}
              currentUserId={user.id}
              currentRole="customer"
              isReadOnly={isReadOnly}
              compact
              header={{
                role: "customer",
                supplierName: typedBooking.venues?.name,
                supplierLogo: typedBooking.venues?.venue_images?.[0]?.url,
                supplierSlug: typedBooking.venues?.slug,
                serviceName: typedBooking.venue_packages?.name,
                inquiryRef: `Booking #${typedBooking.id.substring(0, 8)}`,
                eventType: "Event",
                eventDate: formatDate(typedBooking.event_date),
                venueName: locationLabel(typedBooking.venues),
                venueLink: `/venues/${(typedBooking.venues as any)?.slug}`,
                statusLabel: String(typedBooking.status).replace(/_/g, " "),
              }}
            />
          </section>
        </div>

        {/* Right Sticky Column - Booking Card Widget */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          {/* Action Card */}
          <div className="flex flex-col gap-5 rounded-[24px] border border-[#BFDBFE] bg-white p-6 shadow-sm shadow-blue-200/50">
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
              Next Step
            </h2>

            <div className="grid gap-3">
              {nextAction(typedBooking)}
              {canCancel ? (
                <CustomerCancelBookingButton bookingId={typedBooking.id} />
              ) : null}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="flex flex-col gap-4 rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-slate-200/60">
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
              Payment Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>Venue total</span>
                <span className="font-bold text-slate-950">
                  {formatCurrency(typedBooking.total_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>Required deposit</span>
                <span className="font-bold text-slate-950">
                  {formatCurrency(typedBooking.deposit_amount)}
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Transactions
              </h3>
              {(typedBooking.transactions ?? []).length > 0 ? (
                typedBooking.transactions?.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-950">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <span className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#2563EB]">
                        {transaction.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {transaction.payment_provider.toUpperCase()} •{" "}
                      {formatDate(
                        transaction.paid_at ?? transaction.created_at,
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm font-medium text-slate-500">
                  No payments have been recorded.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
