import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import {
  CustomerCard,
  CustomerPageHeader,
  CustomerStatusBadge,
} from "@/src/components/customer/CustomerUI";
import { createClient } from "@/lib/supabase/server";
import { BookingWorkflowForm } from "@/src/features/booking/ui/booking-workflow-form";
import { userOwnsVenue } from "@/src/lib/rbac/ownership";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    date?: string;
    guests?: string;
    packageId?: string;
  }>;
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

function parseInitialGuests(value: string | undefined, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Book - ${slug.replace(/-/g, " ")}` };
}

export default async function BookVenuePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = searchParams
    ? await searchParams
    : ({} as Awaited<NonNullable<Props["searchParams"]>>);
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/venues/${slug}/book`);
  }

  let venueQuery = supabase
    .from("venues")
    .select(
      "id, name, slug, base_price, price_unit, capacity_min, capacity_max, venue_packages(id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active)",
    )
    .eq("status", "published");

  venueQuery = isUuid(slug) ? venueQuery.eq("id", slug) : venueQuery.eq("slug", slug);

  const { data: venue } = await venueQuery.maybeSingle();

  if (!venue) notFound();

  const bookingIdentifier = venue.slug ?? slug;
  const activePackages = (venue.venue_packages ?? []).filter(
    (item: { is_active?: boolean | null }) => item.is_active !== false,
  );
  const capacityMin = venue.capacity_min ?? 1;
  const capacityMax = venue.capacity_max ?? capacityMin;
  const initialGuests = parseInitialGuests(query?.guests, capacityMin, capacityMax);
  const initialPackageId =
    query?.packageId && query.packageId !== "none" ? query.packageId : undefined;

  const isOwnVenue = await userOwnsVenue(supabase, user.id, venue.id);

  return (
    <div className="bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href={`/venues/${bookingIdentifier}`}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to venue
        </Link>

        <CustomerPageHeader
          eyebrow="Booking request"
          icon={Sparkles}
          title={<>Book {venue.name}</>}
          description={
            <>
              Submit your event details for venue approval. Payment opens after
              the venue sends an approved quote.
            </>
          }
          action={
            <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-[#1D4ED8]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
                Starting price
              </p>
              <p className="mt-1 text-xl font-black tracking-[-0.03em]">
                {formatCurrency(venue.base_price)}
              </p>
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          {isOwnVenue ? (
            <div className="rounded-[32px] border border-[#BFDBFE] bg-[#EFF6FF] p-8 shadow-sm shadow-blue-200/50 flex flex-col items-center justify-center text-center gap-6 py-16">
              <div>
                <h3 className="text-2xl font-black tracking-[-0.03em] text-[#1D4ED8]">
                  You cannot book your own venue.
                </h3>
                <p className="mt-3 text-base font-medium leading-relaxed text-[#3B82F6] max-w-md mx-auto">
                  Use your Venue Owner Dashboard to manage availability, block dates, and view bookings for this venue.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <Link
                  href="/dashboard/calendar"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
                >
                  Manage Calendar
                </Link>
                <Link
                  href={`/dashboard/venues/${venue.id}/edit`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#93C5FD] bg-white px-6 text-sm font-bold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
                >
                  Edit Venue
                </Link>
                <Link
                  href="/dashboard/venue-owner"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#93C5FD] bg-white px-6 text-sm font-bold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <BookingWorkflowForm
              venueId={venue.id}
              venueName={venue.name}
              venueSlug={bookingIdentifier}
              basePrice={venue.base_price}
              priceUnit={venue.price_unit ?? "per_event"}
              capacityMin={capacityMin}
              capacityMax={capacityMax}
              packages={activePackages}
              initialGuests={initialGuests}
              {...(query?.date ? { initialDate: query.date } : {})}
              {...(initialPackageId ? { initialPackageId } : {})}
            />
          )}

          <CustomerCard className="lg:sticky lg:top-24">
            <div className="border-b border-[#E5E7EB] p-5 sm:p-6">
              <CustomerStatusBadge icon={ShieldCheck}>
                Workflow
              </CustomerStatusBadge>
              <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-slate-950">
                From inquiry to review
              </h2>
            </div>

            <ol className="grid gap-0 p-5 text-sm font-semibold text-slate-600 sm:p-6">
              {[
                "Inquiry submitted",
                "Venue approval",
                "Deposit payment",
                "Booking confirmation",
                "Event completion",
                "Customer review",
              ].map((label, index) => (
                <li key={label} className="flex gap-3 border-l border-[#DBEAFE] pb-5 last:border-transparent last:pb-0">
                  <span className="-ml-[13px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span>{label}</span>
                </li>
              ))}
            </ol>
          </CustomerCard>
        </div>
      </div>
    </div>
  );
}
