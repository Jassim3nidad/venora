"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Heart,
  Share2,
  MapPin,
  Users,
  Compass,
  Check,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ParkingCircle,
  Star,
  Flame,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import {
  Badge,
  Button,
  Separator,
  Toast,
  ToastDescription,
  ToastTitle,
} from "@venora/ui";
import VenueGallery from "./VenueGallery";
import VenuePromotionalVideo from "./VenuePromotionalVideo";
import BookingSidebar from "./BookingSidebar";
import ReviewsSection from "./ReviewsSection";
const VenueMap = dynamic(() => import("@/src/components/VenueMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] md:h-[450px] w-full rounded-3xl bg-slate-100 animate-pulse" />
  ),
});
import { toggleFavoriteAction } from "../application/actions";
import { isOptimizableImageSrc } from "@/src/lib/image-host";
import CostEstimatorPanel from "@/features/ai/ui/CostEstimatorPanel";
import RecommendedVenues from "@/features/ai/ui/RecommendedVenues";
import { pickGalleryImages, pickPromotionalVideo } from "../utils/venue-media";

interface VenueDetailsProps {
  venue: any;
  reviews: any[];
  nearbyVenues: any[];
  initialIsFavorited: boolean;
  currentUser: any;
  eligibleReviewBooking?: { id: string; event_date: string | null } | null;
  isOwnVenue?: boolean;
}

function formatCurrency(value?: number | null) {
  if (!value || !Number.isFinite(value)) {
    return "Price pending";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "your completed event";
  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "your completed event";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date);
}

export default function VenueDetails({
  venue,
  reviews = [],
  nearbyVenues = [],
  initialIsFavorited,
  currentUser,
  eligibleReviewBooking = null,
  isOwnVenue = false,
}: VenueDetailsProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://szmjjkywcsnzkgqevinz.supabase.co";
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    title: "",
    description: "",
  });

  const triggerToast = (title: string, description: string) => {
    setToastMessage({ title, description });
    setToastOpen(true);
  };

  const handleFavoriteToggle = async () => {
    if (!currentUser) {
      triggerToast("Sign In Required", "Please log in to save favorites.");
      return;
    }

    // Optimistic update
    setIsFavorited((prev) => !prev);
    setIsTogglingFavorite(true);

    const result = await toggleFavoriteAction({ venueId: venue.id });
    setIsTogglingFavorite(false);

    if (result.error) {
      // Revert if error
      setIsFavorited((prev) => !prev);
      triggerToast("Error", result.error.message);
    } else {
      triggerToast(
        result.data.isFavorited
          ? "Saved to Favorites"
          : "Removed from Favorites",
        result.data.isFavorited
          ? "You can view this venue anytime in your account dashboard."
          : "This venue has been removed from your saved list.",
      );
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    triggerToast(
      "Link Copied",
      "The venue page link has been copied to your clipboard.",
    );
  };

  const mapLatitude = venue.mapLatitude ?? venue.latitude;
  const mapLongitude = venue.mapLongitude ?? venue.longitude;
  const hasMap =
    mapLatitude != null &&
    mapLongitude != null &&
    Number.isFinite(Number(mapLatitude)) &&
    Number.isFinite(Number(mapLongitude));

  const amenitiesList =
    venue.venue_amenities
      ?.map((va: any) => va.amenities?.name)
      .filter(Boolean) ?? [];
  const activePackages = (venue.venue_packages ?? []).filter(
    (pkg: any) => pkg.is_active !== false,
  );
  const rulesList = String(venue.venue_rules ?? "")
    .split(/\r?\n/)
    .map((rule) => rule.trim())
    .filter(Boolean);
  const promotionalVideo = pickPromotionalVideo(venue.venue_images ?? []);
  const galleryImages = pickGalleryImages(venue.venue_images ?? []);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 pb-28 pt-6 font-sans sm:px-6 sm:pt-8 lg:px-8 lg:pb-8">
      {/* Top Header info */}
      <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-[#DBEAFE] bg-[#EFF6FF] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2563EB]"
              >
                {venue.indoor_outdoor}
              </Badge>
              {venue.is_featured && (
                <Badge className="bg-amber-500 text-white font-semibold flex items-center gap-1 text-[10px]">
                  <Flame className="h-3 w-3 fill-current" />
                  Featured
                </Badge>
              )}
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-[-0.04em] text-slate-950 md:text-4xl">
              {venue.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-[#6B7280]">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#2563EB]" />
                {venue.address}, {venue.city}, {venue.province}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#2563EB]" />
                Up to {venue.capacity_max} guests
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex h-11 items-center gap-2 rounded-2xl border-[#E5E7EB] px-4 text-sm font-bold text-[#111827] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            {!isOwnVenue && (
              <Button
                onClick={handleFavoriteToggle}
                variant="outline"
                disabled={isTogglingFavorite}
                className={`flex h-11 items-center gap-2 rounded-2xl border-[#E5E7EB] px-4 text-sm font-bold transition-all hover:border-[#BFDBFE] hover:bg-[#EFF6FF] ${
                  isFavorited
                    ? "text-red-500 border-red-200 bg-red-50/50"
                    : "text-[var(--text-primary)]"
                }`}
              >
                <Heart
                  className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`}
                />
                {isFavorited ? "Favorited" : "Favorite"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <VenueGallery media={galleryImages} venueName={venue.name} />

      {promotionalVideo ? (
        <VenuePromotionalVideo
          video={promotionalVideo}
          venueName={venue.name}
        />
      ) : null}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left Columns - Details Info */}
        <div className="lg:col-span-2 space-y-10">
          {/* About Section */}
          <section className="space-y-4">
            <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
              About the Venue
            </h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-line">
              {venue.description || "No description provided for this venue."}
            </p>
            {venue.ai_generated_description && (
              <div className="space-y-2 rounded-[24px] border border-[#DBEAFE] bg-[#EFF6FF] p-5">
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#2563EB]">
                  <Sparkles className="h-4 w-4" />
                  AI Generated Overview
                </span>
                <p className="text-sm font-medium leading-6 text-[#4B5563]">
                  "{venue.ai_generated_description}"
                </p>
              </div>
            )}
          </section>

          <Separator />

          {/* Amenities grid */}
          <section className="space-y-4">
            <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Amenities & Features
            </h3>
            {amenitiesList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {amenitiesList.map((amenity: string) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-subtle)] border border-[var(--border-default)] p-3.5 rounded-2xl font-medium"
                  >
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
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
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                <ParkingCircle className="h-4.5 w-4.5 text-[var(--color-brand-600)]" />
                Parking & Accessibility
              </span>
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-medium leading-6 text-[#6B7280]">
                <div className="flex gap-3">
                  {venue.parking_available ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <p>
                    {venue.parking_available
                      ? "Secure on-site private parking is available for all guests and coordinators."
                      : "Private on-site parking is not available. Street parking or public pay lots are nearby."}
                  </p>
                </div>

                {venue.wheelchair_accessible && (
                  <div className="mt-3 flex gap-3 border-t border-[#E5E7EB] pt-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>
                      Accessible routes and ramps are fully prepared on-site.
                    </p>
                  </div>
                )}
                {venue.overnight_accommodation && (
                  <div className="mt-3 flex gap-3 border-t border-[#E5E7EB] pt-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>Overnight accommodation is available.</p>
                  </div>
                )}
                {venue.pet_friendly && (
                  <div className="mt-3 flex gap-3 border-t border-[#E5E7EB] pt-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>Pet-friendly arrangements are supported.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
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
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Standard booking policies apply. Respect operating hours,
                  maximum guest capacity constraints, and municipal noise
                  ordinances.
                </p>
              )}
            </div>

            <div className="space-y-3 md:col-span-2">
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                <FileText className="h-4.5 w-4.5 text-[var(--color-brand-600)]" />
                Cancellation Policy
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-subtle)] p-4 rounded-2xl border border-[var(--border-default)]">
                {venue.cancellation_policy ||
                  "Full refund is supported for cancellations requested at least 14 days before the event schedule date. Cancellations inside 14 days forfeit the initial deposit amount."}
              </p>
            </div>
          </section>

          <Separator />

          {/* Location / Map Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Location & Accessibility
              </h3>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                <MapPin className="h-3.5 w-3.5 text-[#2563EB]" />
                {venue.address}, {venue.city}
              </span>
            </div>
            {!hasMap ? (
              <div className="h-[300px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-3xl flex flex-col items-center justify-center text-center p-4">
                <Compass className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Map details unavailable
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {venue.mapPrecision && venue.mapPrecision !== "exact" ? (
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    Approximate location shown (
                    {venue.mapPrecision === "city"
                      ? venue.city
                      : venue.province}
                    )
                  </p>
                ) : null}
                <VenueMap
                  latitude={Number(mapLatitude)}
                  longitude={Number(mapLongitude)}
                  zoom={venue.mapZoom ?? 14}
                  markerLabel={venue.name}
                />
              </div>
            )}
          </section>

          <Separator />

          {/* Host/Organization Info */}
          <section className="flex flex-col items-start justify-between gap-5 rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-slate-200/60 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[var(--color-brand-600)] text-white font-sora font-extrabold flex items-center justify-center text-2xl shadow-md">
                {venue.organizations?.name?.slice(0, 2).toUpperCase() || "VE"}
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-[var(--color-brand-600)] tracking-wide uppercase">
                  Managed By
                </span>
                <h4 className="text-base font-bold text-[var(--text-primary)] font-sora">
                  {venue.organizations?.name || "Venora Host"}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Verified Organization Coordinator</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="text-left sm:text-right text-xs">
                <p className="text-[var(--text-muted)] font-medium">
                  Response Rate
                </p>
                <p className="font-bold text-[var(--text-primary)] text-sm">
                  98% / Fast Response
                </p>
              </div>
            </div>
          </section>

          <Separator />

          {!isOwnVenue && eligibleReviewBooking ? (
            <>
              <section className="rounded-[24px] border border-[#DBEAFE] bg-[#EFF6FF] p-5 shadow-sm shadow-slate-200/60 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#2563EB]">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      Verified guest review
                    </div>
                    <h3 className="mt-3 text-xl font-black tracking-[-0.03em] text-slate-950">
                      Share your experience at {venue.name}
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280]">
                      You can review this venue because your booking on{" "}
                      {formatDate(eligibleReviewBooking.event_date)} is marked
                      completed.
                    </p>
                  </div>
                  <Link
                    href={`/bookings/${eligibleReviewBooking.id}/review`}
                    className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-black text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
                  >
                    <Star className="h-4 w-4" />
                    Write a Review
                  </Link>
                </div>
              </section>

              <Separator />
            </>
          ) : null}

          {/* Reviews Section */}
          <ReviewsSection
            reviews={reviews}
            avgRating={venue.avg_rating}
            reviewCount={venue.review_count}
            currentUserId={currentUser?.id ?? null}
          />
        </div>

        {/* Right Sticky Column - Booking Card Widget */}
        <div className="space-y-4 lg:col-span-1 lg:self-stretch">
          {isOwnVenue ? (
            <div className="sticky top-[9.5rem] rounded-[32px] border border-[#BFDBFE] bg-[#EFF6FF] p-6 shadow-sm shadow-blue-200/50 flex flex-col gap-5">
              <div>
                <h3 className="text-xl font-black tracking-[-0.03em] text-[#1D4ED8]">
                  This is your venue listing.
                </h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[#3B82F6]">
                  You are viewing your venue as customers see it. Manage
                  bookings, availability, packages, and listing details from
                  your Venue Owner Dashboard.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/dashboard/venues"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
                >
                  Manage Venue
                </Link>
                <Link
                  href={`/dashboard/venues/${venue.id}/edit`}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#93C5FD] bg-white px-5 text-sm font-bold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
                >
                  Edit Venue
                </Link>
                <Link
                  href="/dashboard/bookings"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#93C5FD] bg-white px-5 text-sm font-bold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
                >
                  View Bookings
                </Link>
                <Link
                  href="/dashboard/venue-owner"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#93C5FD] bg-white px-5 text-sm font-bold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <>
              <BookingSidebar
                venueId={venue.id}
                venueSlug={venue.slug}
                venueName={venue.name}
                basePrice={venue.base_price}
                priceUnit={venue.price_unit}
                capacityMin={venue.capacity_min ?? 1}
                capacityMax={venue.capacity_max}
                packages={activePackages}
              >
                {(guestCount) => (
                  <CostEstimatorPanel
                    venueId={venue.id}
                    venueName={venue.name}
                    initialGuestCount={guestCount}
                    capacityMin={venue.capacity_min}
                    capacityMax={venue.capacity_max}
                  />
                )}
              </BookingSidebar>
            </>
          )}
        </div>
      </div>

      {/* Nearby Venues Section */}
      {nearbyVenues.length > 0 && (
        <section className="space-y-6 pt-8 border-t border-[var(--border-default)]">
          <div className="space-y-1">
            <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Explore Nearby Venues
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">
              Stunning event venues closest to this location.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {nearbyVenues.map((item) => {
              const coverImg =
                item.venue_images?.find(
                  (i: any) => i.is_featured && i.media_type !== "video",
                ) ??
                item.venue_images?.find((i: any) => i.media_type !== "video");
              const imgUrl = coverImg
                ? String(coverImg.storage_path).startsWith("http")
                  ? coverImg.storage_path
                  : `${supabaseUrl}/storage/v1/object/public/venue-images/${coverImg.storage_path}`
                : null;

              return (
                <Link
                  key={item.id}
                  href={`/venues/${item.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/50 transition-all hover:-translate-y-1 hover:border-[#BFDBFE] hover:shadow-xl hover:shadow-slate-200/70"
                >
                  <div className="relative aspect-[16/10] w-full flex-shrink-0 overflow-hidden bg-slate-100">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={item.name}
                        fill
                        unoptimized={!isOptimizableImageSrc(imgUrl)}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between space-y-4 p-5">
                    <div className="space-y-1">
                      <h4 className="line-clamp-2 text-base font-extrabold leading-snug tracking-[-0.02em] text-slate-950 transition-colors group-hover:text-[#1D4ED8]">
                        {item.name}
                      </h4>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" />
                        <span className="line-clamp-1">
                          {item.city}, {item.province}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-sm font-semibold">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                        <span className="text-[var(--text-primary)]">
                          {item.avg_rating.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[var(--text-primary)]">
                          {formatCurrency(item.base_price)}
                        </span>
                        <span className="text-xs font-normal text-[var(--text-muted)]">
                          /day
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* AI Recommendations */}
      <RecommendedVenues />

      {/* Global Toast component */}
      {toastOpen && (
        <Toast onOpenChange={setToastOpen}>
          <div className="flex flex-col gap-1">
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </div>
        </Toast>
      )}
    </main>
  );
}
