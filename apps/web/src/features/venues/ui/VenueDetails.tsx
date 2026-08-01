"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  Image as ImageIcon,
  MapPin,
  ParkingCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Separator } from "@venora/ui";
import CostEstimatorPanel from "@/features/ai/ui/CostEstimatorPanel";
import RecommendedVenues from "@/features/ai/ui/RecommendedVenues";
import { isOptimizableImageSrc } from "@/src/lib/image-host";
import type { PublicOwnerProfile } from "@/src/features/owners/application/queries";
import type { SmartVenueSearchVenue } from "@/features/search/schemas/search.schema";
import type { PublicVenueProfileViewModel } from "../application/public-venue-profile";
import type { EventPlanVenueFit } from "../application/event-plan-venue-fit";
import { mergeAmenityNames } from "../utils/venue-mappers";
import BookingSidebar from "./BookingSidebar";
import {
  ImagineYourEventHere,
  PropertyOverview,
} from "./ImagineYourEventHere";
import ImmersiveVenueGallery from "./ImmersiveVenueGallery";
import ImmersiveVenueHero, {
  getImmersiveSectionLinks,
  ImmersiveVenueSectionNav,
} from "./ImmersiveVenueHero";
import PackageComparePicker from "./PackageComparePicker";
import ReviewsSection from "./ReviewsSection";
import VenueSpaceExplorer, {
  getSpaceEventFilters,
  VenueJourney,
} from "./VenueSpaceExplorer";

const VenueMap = dynamic(() => import("@/src/components/VenueMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full animate-pulse rounded-xl bg-slate-100 md:h-[360px]" />
  ),
});

interface VenueDetailsProps {
  venue: any;
  profile: PublicVenueProfileViewModel;
  eventPlanFit?: EventPlanVenueFit | null;
  reviews: any[];
  nearbyVenues: any[];
  initialIsFavorited: boolean;
  currentUser: any;
  eligibleReviewBooking?: { id: string; event_date: string | null } | null;
  isOwnVenue?: boolean;
  ownerProfile?: PublicOwnerProfile | null;
  recommendedFallbackVenues?: SmartVenueSearchVenue[];
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
  profile,
  eventPlanFit = null,
  reviews = [],
  nearbyVenues = [],
  initialIsFavorited,
  currentUser,
  eligibleReviewBooking = null,
  isOwnVenue = false,
  ownerProfile = null,
  recommendedFallbackVenues = [],
}: VenueDetailsProps) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://szmjjkywcsnzkgqevinz.supabase.co";

  const mapLatitude = venue.mapLatitude ?? venue.latitude;
  const mapLongitude = venue.mapLongitude ?? venue.longitude;
  const hasMap =
    mapLatitude != null &&
    mapLongitude != null &&
    Number.isFinite(Number(mapLatitude)) &&
    Number.isFinite(Number(mapLongitude));

  const predefinedAmenities =
    venue.venue_amenities
      ?.map((va: any) => va.amenities?.name)
      .filter(Boolean) ?? [];
  const amenitiesList = mergeAmenityNames(
    predefinedAmenities,
    venue.custom_amenities,
  );
  const activePackages = (venue.venue_packages ?? []).filter(
    (pkg: any) => pkg.is_active !== false,
  );
  const rulesList = String(venue.venue_rules ?? "")
    .split(/\r?\n/)
    .map((rule) => rule.trim())
    .filter(Boolean);
  const effectiveReviewCount = profile.rating.count;
  const effectiveAvgRating = profile.rating.average;
  const hostName =
    ownerProfile?.name ?? venue.organizations?.name ?? "Venora Host";
  const hostInitials =
    hostName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join("") || "VO";
  const cityLabel = [venue.city, venue.province].filter(Boolean).join(", ");
  const immersiveMedia = [
    ...profile.gallery,
    ...(profile.hero.video &&
    !profile.gallery.some((item) => item.id === profile.hero.video?.id)
      ? [profile.hero.video]
      : []),
  ];
  const hasEventTypeExperience = getSpaceEventFilters(profile.spaces).length >= 2;
  const renderedSectionIds = [
    "overview",
    ...(profile.spaces.length > 0 ? ["spaces"] : []),
    ...(hasEventTypeExperience ? ["experiences"] : []),
    ...(profile.sections.includes("gallery") ? ["gallery"] : []),
    ...(activePackages.length > 0 ? ["packages"] : []),
    "practical",
    "reviews",
  ];
  const sectionLinks = getImmersiveSectionLinks(
    profile.sections,
    renderedSectionIds,
  );

  return (
    <div className="bg-[#F7F5F1] pb-28 font-sans text-[#151C27] lg:pb-12">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#5C625E]"
        >
          <Link href="/" className="transition-colors hover:text-[#0052CC]">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/venues" className="transition-colors hover:text-[#0052CC]">
            Venues
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#151C27]">{venue.name}</span>
        </nav>
      </div>

      <ImmersiveVenueHero
        profile={profile}
        initialIsFavorited={initialIsFavorited}
        currentUser={currentUser}
        isOwnVenue={isOwnVenue}
      />
      <ImmersiveVenueSectionNav links={sectionLinks} />

      <div className="mx-auto max-w-7xl space-y-12 px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <ImagineYourEventHere fit={eventPlanFit} />
        <div id="overview" className="scroll-mt-40">
          <PropertyOverview profile={profile} />
        </div>
        {profile.spaces.length > 0 ? (
          <VenueSpaceExplorer spaces={profile.spaces} packages={profile.packages} />
        ) : null}
        <VenueJourney spaces={profile.spaces} />
        {profile.sections.includes("gallery") ? (
          <ImmersiveVenueGallery
            media={immersiveMedia}
            spaces={profile.spaces}
            venueName={profile.venue.name}
          />
        ) : null}
      <div className="relative grid grid-cols-1 items-start gap-12 lg:grid-cols-3">
        <div className="space-y-12 lg:col-span-2">
          <section className="space-y-5">
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-[#151C27]">
              About this venue
            </h2>
            <p className="whitespace-pre-line text-lg font-normal leading-8 text-[#434654]">
              {venue.description || "No description provided for this venue."}
            </p>
            {venue.ai_generated_description ? (
              <div className="space-y-2 rounded-xl border border-[#DCE2F3] bg-white p-5">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#0052CC]">
                  <Sparkles className="h-4 w-4" />
                  AI Generated Overview
                </span>
                <p className="text-base font-normal leading-7 text-[#434654]">
                  "{venue.ai_generated_description}"
                </p>
              </div>
            ) : null}
          </section>

          <Separator />

          <section className="space-y-5">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.02em] text-[#151C27]">
                Location
              </h2>
              <p className="mt-3 text-base font-normal text-[#434654]">
                {cityLabel || venue.address}
              </p>
            </div>
            {!hasMap ? (
              <div className="flex h-[300px] flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F0F3FF] p-4 text-center">
                <Compass className="mb-2 h-8 w-8 text-[#737685]" />
                <p className="text-sm font-semibold text-[#151C27]">
                  Map details unavailable
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl">
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

          <section className="space-y-5">
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-[#151C27]">
              Amenities & Features
            </h2>
            {amenitiesList.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {amenitiesList.map((amenity: string) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-base font-medium text-[#434654]"
                  >
                    <Check className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-medium text-[#434654]">
                Amenities have not been added for this venue yet.
              </div>
            )}
          </section>

          <Separator />

          {activePackages.length > 0 ? (
            <>
              <section id="packages" className="scroll-mt-40 space-y-5">
                <h2 className="text-3xl font-bold tracking-[-0.02em] text-[#151C27]">
                  Available Packages
                </h2>
                <p className="text-lg font-normal leading-8 text-[#434654]">
                  Choose from our carefully curated packages designed to fit
                  your event needs.
                </p>
                <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {activePackages.map((pkg: any) => (
                    <div
                      key={pkg.id}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition-colors hover:border-[#0052CC]"
                    >
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <h4 className="text-base font-bold text-[#151C27] transition-colors group-hover:text-[#0052CC]">
                          {pkg.name}
                        </h4>
                        <div className="shrink-0 text-right">
                          <span className="block font-bold text-[#0052CC]">
                            {formatCurrency(pkg.price)}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#737685]">
                            / {pkg.price_unit.replace("per_", "")}
                          </span>
                        </div>
                      </div>

                      {pkg.description ? (
                        <p className="mb-5 flex-grow text-sm leading-relaxed text-[#434654]">
                          {pkg.description}
                        </p>
                      ) : null}

                      {pkg.min_guests || pkg.max_guests ? (
                        <div className="mb-4 flex w-max items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-xs font-semibold text-[#737685]">
                          <Users className="h-3.5 w-3.5 text-[#0052CC]" />
                          <span>
                            {pkg.min_guests ?? 1} - {pkg.max_guests ?? "Any"}{" "}
                            guests
                          </span>
                        </div>
                      ) : null}

                      {pkg.inclusions?.length > 0 ? (
                        <div className="mt-auto border-t border-[#E5E7EB] pt-4">
                          <span className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-[#737685]">
                            Inclusions
                          </span>
                          <ul className="space-y-2">
                            {pkg.inclusions.map(
                              (inclusion: string, i: number) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2.5 text-xs font-medium text-[#434654]"
                                >
                                  <div className="mt-0.5 shrink-0 rounded-full bg-emerald-100 p-0.5">
                                    <Check
                                      className="h-2.5 w-2.5 text-emerald-600"
                                      strokeWidth={3}
                                    />
                                  </div>
                                  <span>{inclusion}</span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {activePackages.length >= 2 ? (
                  <div className="mt-6 rounded-2xl border border-[#DBEAFE] bg-[#F8FBFF] p-5">
                    <PackageComparePicker
                      packages={activePackages.map((pkg: any) => ({
                        id: pkg.id,
                        name: pkg.name,
                        price: Number(pkg.price),
                        price_unit: pkg.price_unit,
                      }))}
                    />
                  </div>
                ) : null}
              </section>
              <Separator />
            </>
          ) : null}

          <section
            id="practical"
            className="scroll-mt-40 grid grid-cols-1 gap-8 md:grid-cols-2"
          >
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#151C27]">
                <ParkingCircle className="h-[18px] w-[18px] text-[#0052CC]" />
                Parking & Accessibility
              </span>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-medium leading-6 text-[#434654]">
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

                {venue.wheelchair_accessible ? (
                  <div className="mt-3 flex gap-3 border-t border-[#E5E7EB] pt-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>
                      Accessible routes and ramps are fully prepared on-site.
                    </p>
                  </div>
                ) : null}
                {venue.overnight_accommodation ? (
                  <div className="mt-3 flex gap-3 border-t border-[#E5E7EB] pt-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>Overnight accommodation is available.</p>
                  </div>
                ) : null}
                {venue.pet_friendly ? (
                  <div className="mt-3 flex gap-3 border-t border-[#E5E7EB] pt-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>Pet-friendly arrangements are supported.</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#151C27]">
                <Clock className="h-[18px] w-[18px] text-[#0052CC]" />
                Venue Rules
              </span>
              {rulesList.length > 0 ? (
                <ul className="space-y-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  {rulesList.map((rule) => (
                    <li
                      key={rule}
                      className="flex gap-2 text-xs leading-relaxed text-[#434654]"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0052CC]" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-[#434654]">
                  Standard booking policies apply. Respect operating hours,
                  maximum guest capacity constraints, and municipal noise
                  ordinances.
                </p>
              )}
            </div>

            <div className="space-y-3 md:col-span-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#151C27]">
                <FileText className="h-[18px] w-[18px] text-[#0052CC]" />
                Cancellation Policy
              </span>
              <p className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-xs leading-relaxed text-[#434654]">
                {venue.cancellation_policy ||
                  "Full refund is supported for cancellations requested at least 14 days before the event schedule date. Cancellations inside 14 days forfeit the initial deposit amount."}
              </p>
            </div>
          </section>

          <Separator />

          <section
            id="venue-owner"
            className="flex flex-col items-start justify-between gap-5 rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0052CC] text-2xl font-bold text-white shadow-md">
                {hostInitials}
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-[#0052CC]">
                  Managed By
                </span>
                <h4 className="text-base font-bold text-[#151C27]">
                  {hostName}
                </h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#434654]">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    {ownerProfile?.isVerified
                      ? "Verified venue owner"
                      : "Venora venue owner"}
                  </span>
                  {ownerProfile ? (
                    <>
                      <span>
                        {ownerProfile.venueCount} venue
                        {ownerProfile.venueCount === 1 ? "" : "s"}
                      </span>
                      {ownerProfile.reviewCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                          {ownerProfile.avgRating.toFixed(1)} from{" "}
                          {ownerProfile.reviewCount} review
                          {ownerProfile.reviewCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {ownerProfile ? (
              <Link
                href={`/owners/${ownerProfile.slug}?from=venue&venueSlug=${venue.slug}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#DCE2F3] bg-[#F0F3FF] px-4 text-sm font-bold text-[#0052CC] transition hover:bg-[#DAE2FF]"
              >
                View owner profile
              </Link>
            ) : null}
          </section>

          <Separator />

          {!isOwnVenue && eligibleReviewBooking ? (
            <>
              <section className="rounded-xl border border-[#DCE2F3] bg-[#F0F3FF] p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0052CC]">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      Verified guest review
                    </div>
                    <h3 className="mt-3 text-xl font-bold tracking-[-0.03em] text-[#151C27]">
                      Share your experience at {venue.name}
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#434654]">
                      You can review this venue because your booking on{" "}
                      {formatDate(eligibleReviewBooking.event_date)} is marked
                      completed.
                    </p>
                  </div>
                  <Link
                    href={`/bookings/${eligibleReviewBooking.id}/review`}
                    className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0052CC] px-5 text-sm font-bold text-white transition hover:bg-[#003D9B]"
                  >
                    <Star className="h-4 w-4" />
                    Write a Review
                  </Link>
                </div>
              </section>
              <Separator />
            </>
          ) : null}

          <ReviewsSection
            reviews={reviews}
            avgRating={effectiveAvgRating}
            reviewCount={effectiveReviewCount}
            currentUserId={currentUser?.id ?? null}
          />
        </div>

        <div id="booking" className="scroll-mt-40 space-y-4 lg:col-span-1 lg:self-stretch">
          {isOwnVenue ? (
            <div className="sticky top-[9.5rem] flex flex-col gap-5 rounded-2xl border border-[#DCE2F3] bg-[#F0F3FF] p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.05)]">
              <div>
                <h3 className="text-xl font-bold tracking-[-0.03em] text-[#0052CC]">
                  This is your venue listing.
                </h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[#434654]">
                  You are viewing your venue as customers see it. Manage
                  bookings, availability, packages, and listing details from
                  your Venue Owner Dashboard.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/dashboard/venues"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0052CC] px-5 text-sm font-bold text-white transition hover:bg-[#003D9B]"
                >
                  Manage Venue
                </Link>
                <Link
                  href={`/dashboard/venues/${venue.id}/edit`}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#B2C5FF] bg-white px-5 text-sm font-bold text-[#0052CC] transition hover:bg-[#DAE2FF]"
                >
                  Edit Venue
                </Link>
                <Link
                  href="/dashboard/bookings"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#B2C5FF] bg-white px-5 text-sm font-bold text-[#0052CC] transition hover:bg-[#DAE2FF]"
                >
                  View Bookings
                </Link>
                <Link
                  href="/dashboard/venue-owner"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#B2C5FF] bg-white px-5 text-sm font-bold text-[#0052CC] transition hover:bg-[#DAE2FF]"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {nearbyVenues.length > 0 ? (
        <section className="space-y-6 border-t border-[#E5E7EB] pt-8">
          <div className="space-y-1">
            <h3 className="text-3xl font-bold tracking-[-0.02em] text-[#151C27]">
              Explore Nearby Venues
            </h3>
            <p className="text-xs font-medium text-[#737685]">
              Stunning event venues closest to this location.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-[#0052CC]"
                >
                  <div className="relative aspect-[16/10] w-full flex-shrink-0 overflow-hidden bg-slate-100">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={item.name}
                        fill
                        unoptimized={!isOptimizableImageSrc(imgUrl)}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100">
                        <ImageIcon className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between space-y-4 p-5">
                    <div className="space-y-1">
                      <h4 className="line-clamp-2 text-base font-bold leading-snug tracking-[-0.02em] text-[#151C27] transition-colors group-hover:text-[#0052CC]">
                        {item.name}
                      </h4>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#737685]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0052CC]" />
                        <span className="line-clamp-1">
                          {item.city}, {item.province}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-sm font-semibold">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                        <span className="text-[#151C27]">
                          {Number(item.avg_rating ?? 0).toFixed(1)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#151C27]">
                          {formatCurrency(item.base_price)}
                        </span>
                        <span className="text-xs font-normal text-[#737685]">
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
      ) : null}

      <RecommendedVenues fallbackVenues={recommendedFallbackVenues} />
      </div>
    </div>
  );
}
