import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Image as ImageIcon,
  MapPin,
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
import { isOptimizableImageSrc } from "@/src/lib/image-host";

type Props = {
  params: Promise<{ slug: string }>;
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
    <div className="min-w-0 bg-white p-5 sm:p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.1em] text-[#64748B]">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-black leading-tight text-slate-950 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function OwnerVenueCard({ venue }: { venue: PublicOwnerVenue }) {
  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white transition hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-lg hover:shadow-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {venue.imageUrl ? (
          <Image
            src={venue.imageUrl}
            alt={venue.name}
            fill
            unoptimized={!isOptimizableImageSrc(venue.imageUrl)}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon aria-hidden="true" className="h-8 w-8 text-slate-300" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-lg font-black leading-tight text-slate-950 group-hover:text-[#1D4ED8]">
            {venue.name}
          </h3>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280]">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[#2563EB]" />
            <span className="line-clamp-1">
              {venue.city}, {venue.province}
            </span>
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4">
          <div className="text-sm font-semibold text-[#6B7280]">
            Up to {venue.capacityMax.toLocaleString("en-PH")} guests
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-slate-950">
              {formatCurrency(venue.basePrice)}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
              {venue.priceUnit.replace("per_", "per ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm font-bold text-slate-950">
          <Star aria-hidden="true" className="h-4 w-4 fill-amber-400 stroke-amber-400" />
          {venue.reviewCount > 0 ? (
            <span>
              {venue.avgRating.toFixed(1)} ({venue.reviewCount})
            </span>
          ) : (
            <span className="text-[#94A3B8]">No reviews yet</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ReviewCard({ review }: { review: PublicOwnerReview }) {
  return (
    <article className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EFF6FF] text-sm font-black text-[#2563EB]">
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
            <h3 className="text-sm font-black text-slate-950">
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
        <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
          <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
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
        <div className="mt-4 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#2563EB]">
            Owner response
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-[#475569]">
            {review.ownerReply}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function OwnerHero({ owner }: { owner: PublicOwnerProfile }) {
  const serviceAreas = summarizeServiceAreas(owner.serviceArea);
  const memberSince = formatDate(owner.createdAt);
  const venueLabel = `${owner.venueCount.toLocaleString("en-PH")} published ${owner.venueCount === 1 ? "venue" : "venues"}`;

  return (
    <section
      aria-labelledby="owner-profile-heading"
      className="border-b border-[#E5E7EB] pb-8 pt-2 sm:pb-10 sm:pt-4"
    >
      <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-2xl font-black text-white shadow-sm shadow-blue-200/70">
            {initials(owner.name) || "VO"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {owner.isVerified ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-emerald-700">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                  Business details verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#2563EB]">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  Venora venue owner
                </span>
              )}
              <span className="text-xs font-bold text-[#64748B]">
                {venueLabel}
              </span>
            </div>
            <h1
              id="owner-profile-heading"
              className="mt-3 min-w-0 break-words text-[1.75rem] font-black leading-[1.12] text-slate-950 sm:text-4xl"
            >
              {owner.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#475569] sm:text-base sm:leading-7">
              Compare the venues they manage, review each space&apos;s details,
              and explore customer feedback before sending a booking request.
            </p>
            {memberSince ? (
              <p className="mt-4 text-sm font-semibold text-[#64748B]">
                Venue owner on Venora since {memberSince}
              </p>
            ) : null}

            {serviceAreas.visibleAreas.length > 0 ? (
              <div className="mt-4 flex min-w-0 items-start gap-2">
                <MapPin
                  aria-hidden="true"
                  className="mt-1 h-4 w-4 shrink-0 text-[#2563EB]"
                />
                <div className="flex min-w-0 flex-wrap gap-2">
                  {serviceAreas.visibleAreas.map((area) => (
                    <span
                      key={area}
                      className="max-w-full break-words rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-2.5 py-1 text-xs font-bold leading-5 text-[#475569]"
                    >
                      {area}
                    </span>
                  ))}
                  {serviceAreas.remainingCount > 0 ? (
                    <span
                      aria-label={`${serviceAreas.remainingCount} additional service areas`}
                      className="rounded-lg bg-[#EFF6FF] px-2.5 py-1 text-xs font-extrabold leading-5 text-[#1D4ED8]"
                    >
                      +{serviceAreas.remainingCount} more areas
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <Link
          href="#venues"
          className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-black text-white shadow-sm shadow-blue-200/70 transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 sm:w-fit lg:justify-self-end"
        >
          View venues
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
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

export default async function OwnerProfilePage({ params }: Props) {
  const { slug } = await params;
  const supabase = (await createClient()) as any;

  const [owner, venues, reviews] = await Promise.all([
    getPublicOwnerProfile(supabase, slug),
    getPublicOwnerVenues(supabase, slug),
    getPublicOwnerReviews(supabase, slug),
  ]);

  if (!owner) notFound();

  const reviewLabels = getOwnerReviewLabels(
    owner.reviewCount,
    owner.avgRating,
  );
  const serviceAreas = summarizeServiceAreas(owner.serviceArea);
  const areaSummary =
    serviceAreas.visibleAreas.length > 0
      ? serviceAreas.visibleAreas.join(", ")
      : "their listed service areas";

  return (
    <main className="mx-auto min-w-0 max-w-7xl space-y-10 px-4 pb-20 pt-6 font-sans sm:px-6 sm:pt-8 lg:px-8">
      <OwnerHero owner={owner} />

      <section
        aria-labelledby="owner-activity-heading"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#E5E7EB] lg:grid-cols-4"
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
          <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#2563EB]">
            About this owner
          </p>
          <h2 className="mt-2 break-words text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            Venue choices managed by {owner.name}
          </h2>
          <p className="mt-4 text-sm font-medium leading-7 text-[#475569] sm:text-base">
            {owner.name} currently manages {owner.venueCount.toLocaleString("en-PH")} published {owner.venueCount === 1 ? "venue" : "venues"} across {areaSummary}.
            Use the listings below to compare locations, capacity, pricing,
            and customer feedback for each space.
          </p>
        </div>

        <aside className="border-t border-[#E5E7EB] pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <h2 className="text-base font-black text-slate-950">
            Profile signals
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
            <li className="flex items-start gap-3">
              <Building2
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]"
              />
              <span>{owner.venueCount.toLocaleString("en-PH")} public {owner.venueCount === 1 ? "listing" : "listings"} available to explore</span>
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
        </aside>
      </section>

      <section id="venues" className="space-y-5 scroll-mt-24">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#2563EB]">
              Managed venues
            </p>
            <h2 className="mt-2 break-words text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
              Venues by {owner.name}
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
              <OwnerVenueCard key={venue.slug} venue={venue} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#BFDBFE] bg-[#F8FAFC] px-6 py-12 text-center">
            <h3 className="text-lg font-black text-slate-950">
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
          <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#2563EB]">
            Customer reviews
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            Recent reviews across their venues
          </h2>
        </div>

        {reviews.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F8FAFC] px-6 py-12 text-center">
            <h3 className="text-lg font-black text-slate-950">
              No reviews yet
            </h3>
            <p className="mt-2 text-sm font-medium text-[#64748B]">
              Published reviews for this owner&apos;s venues will appear here.
            </p>
          </div>
        )}
      </section>

    </main>
  );
}
