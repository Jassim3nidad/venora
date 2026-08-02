"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  MessageSquare,
  Package,
  Route,
} from "lucide-react";
import type { PublicVenueProfileViewModel } from "../application/public-venue-profile";
import InquiryDialog from "./InquiryDialog";
import PackageComparePicker from "./PackageComparePicker";

export function formatPublicPackagePrice(
  price: number | null,
  unit: string | null,
) {
  if (price === null || !Number.isFinite(price)) return "Price on request";
  const amount = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);
  const unitLabel = unit?.replace(/^per_/, "per ").replaceAll("_", " ");
  return unitLabel ? `${amount} ${unitLabel}` : amount;
}

function guestRange(min: number | null, max: number | null) {
  if (min && max)
    return `${min.toLocaleString("en-PH")}-${max.toLocaleString("en-PH")} guests`;
  if (max) return `Up to ${max.toLocaleString("en-PH")} guests`;
  if (min) return `From ${min.toLocaleString("en-PH")} guests`;
  return null;
}

export function VenuePackageExperiences({
  profile,
}: {
  profile: PublicVenueProfileViewModel;
}) {
  if (profile.packages.length === 0) return null;
  const comparablePackages = profile.packages
    .filter(
      (item): item is typeof item & { price: number; priceUnit: string } =>
        item.price !== null && item.priceUnit !== null,
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      price_unit: item.priceUnit,
    }));

  return (
    <section
      id="packages"
      aria-labelledby="packages-heading"
      className="scroll-mt-40 space-y-7"
    >
      <div>
        <p className="text-sm font-bold text-[#876946]">Published packages</p>
        <h2
          id="packages-heading"
          className="mt-2 text-3xl font-bold tracking-[-0.025em] text-[#151C27] sm:text-4xl"
        >
          Choose how your event comes together
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#5C625E]">
          Compare only the spaces, services, guest ranges, and prices the venue
          has explicitly included.
        </p>
      </div>

      <div className="border-b border-[#D9D4C9]">
        {profile.packages.map((item, index) => {
          const range = guestRange(item.minGuests, item.maxGuests);
          return (
            <article
              key={item.id}
              className="grid gap-7 border-t border-[#D9D4C9] py-8 lg:grid-cols-[minmax(12rem,0.72fr)_minmax(0,1.28fr)_11rem] lg:gap-9"
            >
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#876946]">
                  <Package className="h-4 w-4" />
                  Package {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[#151C27]">
                  {item.name}
                </h3>
                {item.description ? (
                  <p className="mt-3 text-sm leading-6 text-[#5C625E]">
                    {item.description}
                  </p>
                ) : null}
                {range ? (
                  <p className="mt-4 text-sm font-semibold text-[#5C625E]">
                    {range}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {item.includedSpaces.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-bold text-[#151C27]">
                      Included spaces
                    </h4>
                    <ul className="mt-2 space-y-2">
                      {item.includedSpaces.map((space) => (
                        <li
                          key={space.key}
                          className="flex gap-2 text-sm leading-6 text-[#5C625E]"
                        >
                          <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                          <span>
                            {space.name}
                            {space.notes ? ` - ${space.notes}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {item.inclusions.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-bold text-[#151C27]">
                      Included services and items
                    </h4>
                    <ul className="mt-2 space-y-2">
                      {item.inclusions.map((inclusion) => (
                        <li
                          key={inclusion}
                          className="flex gap-2 text-sm leading-6 text-[#5C625E]"
                        >
                          <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                          {inclusion}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[#D9D4C9] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:text-right">
                <p className="text-xl font-bold text-[#151C27]">
                  {formatPublicPackagePrice(item.price, item.priceUnit)}
                </p>
                <a
                  href="#booking"
                  className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#0052CC] underline underline-offset-4"
                >
                  Check dates
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {comparablePackages.length >= 2 ? (
        <PackageComparePicker packages={comparablePackages} />
      ) : null}
    </section>
  );
}

export function VenuePracticalDetails({
  profile,
  rules,
  cancellationPolicy,
}: {
  profile: PublicVenueProfileViewModel;
  rules: string[];
  cancellationPolicy: string | null;
}) {
  const hasPolicies = rules.length > 0 || Boolean(cancellationPolicy);
  if (profile.logistics.length === 0 && !hasPolicies) return null;

  return (
    <section
      id="practical"
      aria-labelledby="practical-heading"
      className="scroll-mt-40 space-y-7 bg-[#EEE8DC] px-5 py-8 sm:px-8 sm:py-10"
    >
      <div>
        <p className="text-sm font-bold text-[#876946]">Before you inquire</p>
        <h2
          id="practical-heading"
          className="mt-2 text-3xl font-bold tracking-[-0.025em] text-[#151C27] sm:text-4xl"
        >
          Practical details
        </h2>
      </div>

      {profile.logistics.length > 0 ? (
        <dl className="grid border-t border-[#D9D4C9] sm:grid-cols-2">
          {profile.logistics.map((item) => (
            <div
              key={item.key}
              className="border-b border-[#D9D4C9] py-5 pr-5 sm:odd:border-r sm:even:pl-5"
            >
              <dt className="flex items-center gap-2 text-sm font-bold text-[#151C27]">
                <Route className="h-4 w-4 text-[#876946]" />
                {item.label}
              </dt>
              <dd className="mt-2 text-sm leading-6 text-[#5C625E]">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {hasPolicies ? (
        <div className="grid gap-7 md:grid-cols-2">
          {rules.length > 0 ? (
            <div>
              <h3 className="text-lg font-bold text-[#151C27]">Venue rules</h3>
              <ul className="mt-3 space-y-2">
                {rules.map((rule) => (
                  <li
                    key={rule}
                    className="flex gap-2 text-sm leading-6 text-[#5C625E]"
                  >
                    <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {cancellationPolicy ? (
            <div>
              <h3 className="text-lg font-bold text-[#151C27]">
                Cancellation policy
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#5C625E]">
                {cancellationPolicy}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function VenueFaqs({
  profile,
}: {
  profile: PublicVenueProfileViewModel;
}) {
  if (profile.faqs.length === 0) return null;

  return (
    <section
      id="faqs"
      aria-labelledby="faqs-heading"
      className="scroll-mt-40 space-y-6"
    >
      <div>
        <p className="text-sm font-bold text-[#876946]">Questions, answered</p>
        <h2
          id="faqs-heading"
          className="mt-2 text-3xl font-bold tracking-[-0.025em] text-[#151C27] sm:text-4xl"
        >
          Venue FAQs
        </h2>
      </div>
      <div className="border-t border-[#D9D4C9]">
        {profile.faqs.map((faq) => (
          <details
            key={faq.question}
            className="group border-b border-[#D9D4C9]"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-bold text-[#151C27] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0052CC] [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <CircleHelp className="h-5 w-5 shrink-0 text-[#876946]" />
                {faq.question}
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <p className="max-w-3xl pb-5 pl-8 text-sm leading-7 text-[#5C625E]">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function VenueFinalDecision({
  profile,
}: {
  profile: PublicVenueProfileViewModel;
}) {
  return (
    <section
      aria-labelledby="next-step-heading"
      className="bg-[#17201C] px-5 py-10 text-white sm:px-8 sm:py-12 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-12"
    >
      <div>
        <p className="text-sm font-bold text-[#D1B58A]">
          Your event, your next step
        </p>
        <h2
          id="next-step-heading"
          className="mt-2 text-3xl font-bold tracking-[-0.025em] sm:text-4xl"
        >
          Ready to take the next step?
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">
          Ask the venue a question, confirm a date, or continue through
          Venora&apos;s existing booking flow.
        </p>
      </div>
      <div className="mt-7 flex flex-wrap gap-3 lg:mt-0 lg:justify-end">
        <Link
          href={profile.actions.eventPlanHref}
          className="inline-flex min-h-11 items-center rounded-lg border border-white/45 px-5 text-sm font-bold text-white hover:bg-white/10"
        >
          Build Event Plan
        </Link>
        <InquiryDialog
          venueId={profile.venue.id}
          venueName={profile.venue.name}
          trigger={
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/45 px-5 text-sm font-bold text-white hover:bg-white/10"
            >
              <MessageSquare className="h-4 w-4" />
              Send inquiry
            </button>
          }
        />
        <a
          href="#booking"
          className="inline-flex min-h-11 items-center rounded-lg border border-white/45 px-5 text-sm font-bold text-white hover:bg-white/10"
        >
          Request availability
        </a>
        <Link
          href={profile.actions.bookingHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#151C27] hover:bg-[#F3EFE8]"
        >
          Continue booking
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
