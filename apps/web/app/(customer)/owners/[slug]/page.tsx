import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getPublicOwnerProfile,
  getPublicOwnerReviews,
  getPublicOwnerVenues,
  type PublicOwnerProfile,
  type PublicOwnerReview,
  type PublicOwnerVenue,
} from "@/src/features/owners/application/queries";
import {
  getOwnerReviewLabels,
  summarizeServiceAreas,
} from "@/src/features/owners/ui/owner-profile-presentation";
import FeaturedVenueCard from "@/src/features/venues/ui/FeaturedVenueCard";
import type { Venue } from "@/src/features/venues/utils/venue-mappers";
import { isOptimizableImageSrc } from "@/src/lib/image-host";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value?: number | null) {
  if (!value || !Number.isFinite(Number(value))) return "Price on request";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function resolveBusinessProfileImageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("/")) return path;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  return `${supabaseUrl}/storage/v1/object/public/business-profiles/${path}`;
}

function ownerLocation(owner: PublicOwnerProfile) {
  return [owner.city, owner.province].filter(Boolean).join(", ") || null;
}

function firstSearchParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = params?.[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function buildSearchParams(
  params: Record<string, string | string[] | undefined> | undefined,
) {
  const query = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (firstValue) query.set(key, firstValue);
  });

  const value = query.toString();
  return value ? `?${value}` : "";
}

function ownerBreadcrumbItems({
  owner,
  venues,
  searchParams,
}: {
  owner: PublicOwnerProfile;
  venues: PublicOwnerVenue[];
  searchParams: Record<string, string | string[] | undefined> | undefined;
}): BreadcrumbItem[] {
  const from = firstSearchParam(searchParams, "from");

  if (from === "venue") {
    const venueSlug = firstSearchParam(searchParams, "venueSlug");
    const sourceVenue = venues.find((venue) => venue.slug === venueSlug);

    if (sourceVenue) {
      return [
        { label: "Venues", href: "/venues" },
        { label: sourceVenue.name, href: `/venues/${sourceVenue.slug}` },
        { label: owner.name },
      ];
    }
  }

  if (from === "booking") {
    const bookingId = firstSearchParam(searchParams, "bookingId");

    if (bookingId) {
      return [
        { label: "My Bookings", href: "/bookings" },
        { label: "Booking Details", href: `/bookings/${bookingId}` },
        { label: owner.name },
      ];
    }
  }

  return [
    { label: "Home", href: "/" },
    { label: "Venue Owners" },
    { label: owner.name },
  ];
}

function StatItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 bg-white p-4">
      <Icon
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]"
      />
      <div className="min-w-0">
        <p className="break-words text-base font-bold leading-tight text-slate-950">
          {value}
        </p>
        <p className="mt-1 text-sm font-medium text-[#64748B]">{label}</p>
      </div>
    </div>
  );
}

function toVenueCardData(venue: PublicOwnerVenue): Venue {
  const settingLabel = venue.priceUnit.replace("per_", "Per ");

  return {
    id: venue.slug,
    slug: venue.slug,
    name: venue.name,
    location: [venue.city, venue.province].filter(Boolean).join(", "),
    price: formatCurrency(venue.basePrice),
    capacity: `Up to ${venue.capacityMax.toLocaleString("en-PH")} pax`,
    image: venue.imageUrl,
    rating: venue.reviewCount > 0 ? venue.avgRating : 0,
    category: settingLabel,
    city: venue.city,
    municipality: venue.municipality ?? venue.city,
    province: venue.province,
    basePrice: venue.basePrice,
    capacityMin: venue.capacityMin,
    capacityMax: venue.capacityMax,
  };
}

function ReviewCard({ review }: { review: PublicOwnerReview }) {
  return (
    <article className="rounded-lg border border-[#E5E7EB] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EFF6FF] text-sm font-bold text-[#2563EB]">
            {review.customerAvatarUrl ? (
              <Image
                src={review.customerAvatarUrl}
                alt={review.customerName}
                width={40}
                height={40}
                unoptimized={!isOptimizableImageSrc(review.customerAvatarUrl)}
                className="h-full w-full object-cover"
              />
            ) : (
              initials(review.customerName) || "VC"
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-950">
              {review.customerName}
            </h3>
            <Link
              href={`/venues/${review.venueSlug}`}
              className="text-xs font-bold text-[#2563EB] hover:underline"
            >
              {review.venueName}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
          <Star
            aria-hidden="true"
            className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400"
          />
          {review.overallRating.toFixed(1)}
        </div>
      </div>

      {review.comment ? (
        <p className="mt-4 line-clamp-4 text-sm font-medium leading-6 text-[#475569]">
          {review.comment}
        </p>
      ) : (
        <p className="mt-4 text-sm font-medium text-[#94A3B8]">
          This customer left a star rating.
        </p>
      )}

      {review.ownerReply ? (
        <div className="mt-4 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] p-4">
          <p className="text-xs font-bold text-[#2563EB]">Owner response</p>
          <p className="mt-2 text-sm font-medium leading-6 text-[#475569]">
            {review.ownerReply}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function ProfileSignal({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <Icon
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]"
      />
      <span>
        <span className="font-bold text-slate-950">{label}: </span>
        {children}
      </span>
    </li>
  );
}

function OwnerHero({
  owner,
  breadcrumbItems,
}: {
  owner: PublicOwnerProfile;
  breadcrumbItems: BreadcrumbItem[];
}) {
  const serviceAreas = summarizeServiceAreas(owner.serviceArea);
  const memberSince = formatDate(owner.createdAt);
  const venueLabel = `${owner.venueCount.toLocaleString("en-PH")} published ${owner.venueCount === 1 ? "venue" : "venues"}`;
  const logoSrc = resolveBusinessProfileImageUrl(owner.logoPath);
  const coverSrc = resolveBusinessProfileImageUrl(owner.coverImagePath);
  const hasPublicContact =
    Boolean(owner.publicEmail) ||
    Boolean(owner.publicPhone) ||
    Boolean(owner.websiteUrl);
  const description =
    owner.tagline ||
    owner.shortDescription ||
    "Compare the venues they manage, review each space's details, and explore customer feedback before sending a booking request.";

  return (
    <section aria-labelledby="owner-profile-heading" className="space-y-5">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#64748B]"
      >
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <span
              key={`${item.label}-${index}`}
              className="inline-flex min-w-0 items-center gap-2"
            >
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-[#2563EB]">
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast ? "min-w-0 break-words text-slate-950" : undefined
                  }
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              ) : null}
            </span>
          );
        })}
      </nav>

      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
        <div className="relative h-40 bg-[#EEF2F7] sm:h-56 lg:h-64">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={`${owner.name} cover image`}
              fill
              priority
              unoptimized={!isOptimizableImageSrc(coverSrc)}
              sizes="(max-width: 768px) 100vw, 1200px"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#EEF2F7,#F8FAFC)]" />
          )}
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#2563EB] text-2xl font-bold text-white shadow-sm sm:h-24 sm:w-24">
                {logoSrc ? (
                  <Image
                    src={logoSrc}
                    alt={`${owner.name} logo`}
                    width={96}
                    height={96}
                    unoptimized={!isOptimizableImageSrc(logoSrc)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(owner.name) || "VO"
                )}
              </div>

              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
                  {owner.isVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                      Business details verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#2563EB]">
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      Venora venue owner
                    </span>
                  )}
                  <span className="text-[#64748B]">{venueLabel}</span>
                </div>

                <h1
                  id="owner-profile-heading"
                  className="mt-2 min-w-0 break-words text-3xl font-bold leading-tight text-slate-950 sm:text-4xl"
                >
                  {owner.name}
                </h1>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {hasPublicContact ? (
                <Link
                  href="#contact"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-[#DCE2F3] bg-white px-4 text-sm font-bold text-[#2563EB] transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                >
                  Contact owner
                </Link>
              ) : null}
              <Link
                href="#venues"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-bold text-white transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
              >
                View venues
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm font-medium leading-6 text-[#475569] sm:text-base sm:leading-7">
            {description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[#64748B]">
            {memberSince ? <span>On Venora since {memberSince}</span> : null}
            {serviceAreas.visibleAreas.length > 0 ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-[#2563EB]"
                />
                <span className="min-w-0 break-words">
                  {serviceAreas.visibleAreas.join(", ")}
                  {serviceAreas.remainingCount > 0
                    ? ` +${serviceAreas.remainingCount} more`
                    : ""}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = (await createClient()) as any;
  const owner = await getPublicOwnerProfile(supabase, slug);

  if (!owner) {
    return {
      title: "Venue Owner Not Found",
      description: "This Venora venue owner profile could not be found.",
    };
  }

  return {
    title: `${owner.name} - Venue Owner on Venora`,
    description: `View venues, reviews, and booking credibility for ${owner.name} on Venora.`,
    alternates: { canonical: `/owners/${owner.slug}` },
  };
}

export default async function OwnerProfilePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = (await createClient()) as any;

  const owner = await getPublicOwnerProfile(supabase, slug);
  if (!owner) notFound();

  if (owner.slug !== slug) {
    redirect(`/owners/${owner.slug}${buildSearchParams(resolvedSearchParams)}`);
  }

  const [{ data: authData }, venues, reviews] = await Promise.all([
    supabase.auth.getUser(),
    getPublicOwnerVenues(supabase, owner.slug),
    getPublicOwnerReviews(supabase, owner.slug),
  ]);

  const reviewLabels = getOwnerReviewLabels(owner.reviewCount, owner.avgRating);
  const serviceAreas = summarizeServiceAreas(owner.serviceArea);
  const breadcrumbItems = ownerBreadcrumbItems({
    owner,
    venues,
    searchParams: resolvedSearchParams,
  });
  const areaSummary =
    serviceAreas.visibleAreas.length > 0
      ? serviceAreas.visibleAreas.join(", ")
      : "their listed service areas";
  const aboutText =
    owner.about ||
    `${owner.name} currently manages ${owner.venueCount.toLocaleString("en-PH")} published ${owner.venueCount === 1 ? "venue" : "venues"} across ${areaSummary}. Use the listings below to compare locations, capacity, pricing, and customer feedback for each space.`;
  const location = ownerLocation(owner);
  const hasPublicContact =
    Boolean(owner.publicEmail) ||
    Boolean(owner.publicPhone) ||
    Boolean(owner.websiteUrl);
  const isAuthenticated = Boolean(authData?.user);

  return (
    <div className="mx-auto min-w-0 max-w-7xl space-y-10 px-4 pb-20 pt-6 font-sans text-[#151C27] sm:px-6 sm:pt-8 lg:px-8">
      <OwnerHero owner={owner} breadcrumbItems={breadcrumbItems} />

      <section
        aria-labelledby="owner-activity-heading"
        className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#E5E7EB] sm:grid-cols-2 lg:grid-cols-4"
      >
        <h2 id="owner-activity-heading" className="sr-only">
          Owner activity
        </h2>
        <StatItem
          icon={Building2}
          label="Published venues"
          value={owner.venueCount.toLocaleString("en-PH")}
        />
        <StatItem
          icon={CalendarCheck2}
          label="Completed bookings"
          value={owner.completedBookingCount.toLocaleString("en-PH")}
        />
        <StatItem
          icon={Star}
          label="Average rating"
          value={reviewLabels.rating}
        />
        <StatItem
          icon={Users}
          label="Customer reviews"
          value={reviewLabels.reviews}
        />
      </section>

      <section className="grid gap-8 border-y border-[#E5E7EB] py-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:py-10">
        <div className="min-w-0 max-w-3xl">
          <h2 className="break-words text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
            About {owner.name}
          </h2>
          {owner.shortDescription ? (
            <p className="mt-4 text-sm font-bold leading-7 text-slate-700 sm:text-base">
              {owner.shortDescription}
            </p>
          ) : null}
          <p className="mt-4 text-sm font-medium leading-7 text-[#475569] sm:text-base">
            {aboutText}
          </p>
        </div>

        <aside className="border-t border-[#E5E7EB] pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <h2 className="text-base font-bold text-slate-950">
            Trust and business details
          </h2>
          <ul className="mt-5 space-y-4 text-sm font-semibold text-[#475569]">
            <li className="flex items-start gap-3">
              {owner.isVerified ? (
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                />
              ) : (
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]"
                />
              )}
              <span>
                {owner.isVerified
                  ? "Business registration details verified by Venora"
                  : "Active owner with published venues on Venora"}
              </span>
            </li>
            {owner.yearEstablished ? (
              <ProfileSignal icon={CalendarCheck2} label="Established">
                {owner.yearEstablished}
              </ProfileSignal>
            ) : null}
            {location ? (
              <ProfileSignal icon={MapPin} label="Public location">
                {location}
              </ProfileSignal>
            ) : null}
            <li className="flex items-start gap-3">
              <Building2
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]"
              />
              <span>
                {owner.venueCount.toLocaleString("en-PH")} public{" "}
                {owner.venueCount === 1 ? "listing" : "listings"} available to
                explore
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Star
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
              />
              <span>
                {owner.reviewCount > 0
                  ? `${reviewLabels.rating} from ${reviewLabels.reviews}`
                  : "No customer reviews published yet"}
              </span>
            </li>
          </ul>
          {hasPublicContact ? (
            <div id="contact" className="mt-7 border-t border-[#E5E7EB] pt-6">
              <h3 className="text-base font-bold text-slate-950">
                Contact information
              </h3>
              <ul className="mt-4 space-y-3 text-sm font-semibold text-[#475569]">
                {owner.publicEmail ? (
                  <ProfileSignal icon={Mail} label="Email">
                    <a
                      href={`mailto:${owner.publicEmail}`}
                      className="break-all text-[#2563EB] hover:underline"
                    >
                      {owner.publicEmail}
                    </a>
                  </ProfileSignal>
                ) : null}
                {owner.publicPhone ? (
                  <ProfileSignal icon={Phone} label="Phone">
                    <a
                      href={`tel:${owner.publicPhone}`}
                      className="break-all text-[#2563EB] hover:underline"
                    >
                      {owner.publicPhone}
                    </a>
                  </ProfileSignal>
                ) : null}
                {owner.websiteUrl ? (
                  <ProfileSignal icon={Globe2} label="Website">
                    <a
                      href={owner.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1 break-all text-[#2563EB] hover:underline"
                    >
                      {owner.websiteUrl}
                      <ExternalLink
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0"
                      />
                    </a>
                  </ProfileSignal>
                ) : null}
              </ul>
            </div>
          ) : null}
        </aside>
      </section>

      <section id="venues" className="space-y-5 scroll-mt-24">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
              Venues managed by {owner.name}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#64748B]">
              Open a venue to review its amenities, capacity, pricing, and
              booking details.
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-[#64748B]">
            {venues.length} published venue{venues.length === 1 ? "" : "s"}
          </p>
        </div>

        {venues.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <FeaturedVenueCard
                key={venue.slug}
                venue={toVenueCardData(venue)}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#BFDBFE] bg-[#F8FAFC] px-6 py-8 text-center">
            <h3 className="text-lg font-bold text-slate-950">
              No published venues yet
            </h3>
            <p className="mt-2 text-sm font-medium text-[#64748B]">
              This owner does not have public venues available right now.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
            Reputation across published venues
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#64748B]">
            Reviews are collected from completed Venora bookings for this
            owner&apos;s venue listings.
          </p>
        </div>

        {reviews.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F8FAFC] px-6 py-8 text-center">
            <h3 className="text-lg font-bold text-slate-950">No reviews yet</h3>
            <p className="mt-2 text-sm font-medium text-[#64748B]">
              Published reviews for this owner&apos;s venues will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
