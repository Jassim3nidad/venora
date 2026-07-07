import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Users,
} from "lucide-react";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import {
  CustomerButton,
  CustomerCard,
  CustomerPageHeader,
  CustomerStatusBadge,
} from "@/src/components/customer/CustomerUI";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateInputValue } from "@/src/lib/date-only";

interface Props {
  params: Promise<{ slug: string }>;
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Book - ${slug.replace(/-/g, " ")}` };
}

export default async function BookVenuePage({ params }: Props) {
  const { slug } = await params;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: venue } = await supabase
    .from("venues")
    .select(
      "id, name, slug, base_price, capacity_min, capacity_max, venue_packages(*)",
    )
    .eq("slug", slug)
    .single();

  if (!venue) notFound();

  const priceLabel = formatCurrency(venue.base_price);
  const capacityLabel =
    venue.capacity_min && venue.capacity_max
      ? `${venue.capacity_min.toLocaleString("en-PH")} to ${venue.capacity_max.toLocaleString("en-PH")} guests`
      : "Guest count";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <CustomerNavbar user={user} />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href={`/venues/${venue.slug ?? slug}`}
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
              Share your event details with the venue. You will not be charged
              until the venue confirms your request.
            </>
          }
          action={
            <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-[#1D4ED8]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
                Starting price
              </p>
              <p className="mt-1 text-xl font-black tracking-[-0.03em]">
                {priceLabel}
              </p>
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <CustomerCard>
            <form id="booking-form" className="grid gap-6 p-5 sm:p-7">
              <div>
                <CustomerStatusBadge icon={CalendarDays}>
                  Event details
                </CustomerStatusBadge>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  Tell the venue what you are planning.
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280]">
                  Date, time, guest count, and notes help the venue respond with
                  accurate availability and pricing.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label
                    htmlFor="booking-event-date"
                    className="text-sm font-bold text-slate-700"
                  >
                    Event date
                  </label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563EB]" />
                    <input
                      id="booking-event-date"
                      type="date"
                      name="event_date"
                      min={getLocalDateInputValue()}
                      className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label
                    htmlFor="booking-guest-count"
                    className="text-sm font-bold text-slate-700"
                  >
                    Guest count
                  </label>
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563EB]" />
                    <input
                      id="booking-guest-count"
                      type="number"
                      name="guest_count"
                      min={venue.capacity_min ?? undefined}
                      max={venue.capacity_max ?? undefined}
                      placeholder={capacityLabel}
                      className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-[#BFDBFE] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label
                    htmlFor="booking-start-time"
                    className="text-sm font-bold text-slate-700"
                  >
                    Start time
                  </label>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563EB]" />
                    <input
                      id="booking-start-time"
                      type="time"
                      name="start_time"
                      className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label
                    htmlFor="booking-end-time"
                    className="text-sm font-bold text-slate-700"
                  >
                    End time
                  </label>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563EB]" />
                    <input
                      id="booking-end-time"
                      type="time"
                      name="end_time"
                      className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="booking-notes"
                  className="text-sm font-bold text-slate-700"
                >
                  Notes (optional)
                </label>
                <div className="relative">
                  <MessageSquareText className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-[#2563EB]" />
                  <textarea
                    id="booking-notes"
                    name="notes"
                    rows={5}
                    placeholder="Tell the venue about your event..."
                    className="min-h-32 w-full resize-y rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] py-3 pl-11 pr-4 text-sm font-semibold leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-[#BFDBFE] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                </div>
              </div>

              <CustomerButton
                id="booking-submit-btn"
                type="submit"
                className="w-full"
              >
                <TicketCheck className="h-4 w-4" />
                Request Booking
              </CustomerButton>
            </form>
          </CustomerCard>

          <CustomerCard className="lg:sticky lg:top-24">
            <div className="border-b border-[#E5E7EB] p-5 sm:p-6">
              <CustomerStatusBadge icon={ShieldCheck}>
                Booking summary
              </CustomerStatusBadge>
              <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-slate-950">
                Review before sending
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280]">
                This request goes to the venue team first. Payment happens only
                after confirmation.
              </p>
            </div>

            <div className="grid gap-4 p-5 sm:p-6">
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
                  Venue
                </p>
                <p className="mt-1 text-base font-black text-slate-950">
                  {venue.name}
                </p>
              </div>

              <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4 text-[#1D4ED8]">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold">Base price</span>
                  <span className="text-sm font-black">{priceLabel}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 border-t border-[#BFDBFE] pt-3">
                  <span className="text-base font-black">Estimated total</span>
                  <span className="text-base font-black">{priceLabel}</span>
                </div>
              </div>

              <p className="text-center text-xs font-semibold leading-5 text-[#6B7280]">
                You will not be charged from this form.
              </p>
            </div>
          </CustomerCard>
        </div>
      </main>
    </div>
  );
}
