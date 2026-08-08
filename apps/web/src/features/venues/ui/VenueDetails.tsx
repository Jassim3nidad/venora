"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Check,
  ChevronRight,
  Compass,
  Image as ImageIcon,
  MapPin,
  ShieldCheck,
  Star,
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
import { ImagineYourEventHere, PropertyOverview } from "./ImagineYourEventHere";
import ImmersiveVenueGallery from "./ImmersiveVenueGallery";
import ImmersiveVenueHero, {
  getImmersiveSectionLinks,
  ImmersiveVenueSectionNav,
} from "./ImmersiveVenueHero";
import {
  VenueFaqs,
  VenueFinalDecision,
  VenuePackageExperiences,
  VenuePracticalDetails,
} from "./ImmersiveVenueDecisionSections";
import ReviewsSection from "./ReviewsSection";
import ThemePreviewSection from "./ThemePreviewSection";
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
  const hasEventTypeExperience =
    getSpaceEventFilters(profile.spaces).length >= 2;
  const hasPracticalDetails =
    profile.logistics.length > 0 ||
    rulesList.length > 0 ||
    Boolean(venue.cancellation_policy);
  const renderedSectionIds = [
    "overview",
    ...(profile.spaces.length > 0 ? ["spaces"] : []),
    ...(hasEventTypeExperience ? ["experiences"] : []),
    ...(profile.sections.includes("gallery") ? ["gallery"] : []),
    ...(profile.packages.length > 0 ? ["packages"] : []),
    ...(hasPracticalDetails ? ["practical"] : []),
    ...(profile.faqs.length > 0 ? ["faqs"] : []),
    "reviews",
  ];
  const sectionLinks = getImmersiveSectionLinks(
    profile.sections,
    renderedSectionIds,
  );

  return (
    <div className="relative bg-[#F7F5F1] pb-28 font-sans text-[#151C27] lg:pb-12">
      <div className="sr-only sm:not-sr-only sm:pointer-events-none sm:absolute sm:inset-x-0 sm:top-28 sm:z-20 sm:mx-auto sm:max-w-7xl sm:px-6 sm:pt-3 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="pointer-events-auto flex flex-wrap items-center gap-2 text-xs font-semibold text-white/75 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)] sm:text-sm"
        >
          <Link href="/" className="transition-colors hover:text-white">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/venues" className="transition-colors hover:text-white">
            Venues
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="line-clamp-1 text-white">{venue.name}</span>
        </nav>
      </div>

      <ImmersiveVenueHero
        profile={profile}
        initialIsFavorited={initialIsFavorited}
        currentUser={currentUser}
        isOwnVenue={isOwnVenue}
      />
      <ImmersiveVenueSectionNav links={sectionLinks} />

      <div>
        <ImagineYourEventHere fit={eventPlanFit} profile={profile} />
        <div id="overview" className="scroll-mt-40">
          <PropertyOverview profile={profile} />
        </div>
        {profile.spaces.length > 0 ? (
          <VenueSpaceExplorer
            spaces={profile.spaces}
            packages={profile.packages}
          />
        ) : null}
        <VenueJourney spaces={profile.spaces} />
        {profile.sections.includes("gallery") ? (
          <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <ImmersiveVenueGallery
              media={immersiveMedia}
              spaces={profile.spaces}
              venueName={profile.venue.name}
            />
          </div>
        ) : null}
        {/*
          Sits below the gallery, matching the feature spec. Renders nothing
          when the venue has no Storage-backed venue_images row — the AI
          preview is keyed on a real photo id, and dataset fallback venues
          have none.
        */}
        <div className="mx-auto max-w-[90rem] px-4 pb-12 sm:px-6 lg:px-8">
          <ThemePreviewSection
            venueId={venue.id}
            venueName={profile.venue.name}
            media={venue.venue_images ?? []}
            heroImageSrc={profile.hero.image?.src ?? null}
          />
        </div>
        <div className="mx-auto max-w-[90rem] px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
          <div className="relative grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-16">
            <div className="min-w-0 space-y-12">
              {profile.venue.description ? (
                <section className="space-y-5">
                  <h2 className="text-3xl font-bold tracking-[-0.02em] text-[#151C27]">
                    About this venue
                  </h2>
                  <p className="whitespace-pre-line text-lg font-normal leading-8 text-[#434654]">
                    {profile.venue.description}
                  </p>
                </section>
              ) : null}

              {profile.venue.description ? <Separator /> : null}

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

              {amenitiesList.length > 0 ? (
                <section className="space-y-5">
                  <h2 className="text-3xl font-bold tracking-[-0.02em] text-[#151C27]">
                    Amenities & Features
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {amenitiesList.map((amenity: string) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-3 border-b border-[#D9D4C9] py-3 text-base font-medium text-[#434654]"
                      >
                        <Check className="h-5 w-5 flex-shrink-0 text-emerald-700" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {amenitiesList.length > 0 ? <Separator /> : null}

              <VenuePackageExperiences profile={profile} />

              {profile.packages.length > 0 ? <Separator /> : null}

              <VenuePracticalDetails
                profile={profile}
                rules={rulesList}
                cancellationPolicy={venue.cancellation_policy ?? null}
              />

              {hasPracticalDetails ? <Separator /> : null}

              <VenueFaqs profile={profile} />

              {profile.faqs.length > 0 ? <Separator /> : null}

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
                          {formatDate(eligibleReviewBooking.event_date)} is
                          marked completed.
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

            <div
              id="booking"
              className="scroll-mt-40 space-y-4 lg:col-span-1 lg:self-stretch"
            >
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

          {!isOwnVenue ? <VenueFinalDecision profile={profile} /> : null}

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
                    item.venue_images?.find(
                      (i: any) => i.media_type !== "video",
                    );
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
    </div>
  );
}
