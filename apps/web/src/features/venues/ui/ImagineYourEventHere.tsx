import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Images,
  MapPin,
  Package,
} from "lucide-react";
import type { EventPlanVenueFit } from "../application/event-plan-venue-fit";
import type { PublicVenueProfileViewModel } from "../application/public-venue-profile";

export function ImagineYourEventHere({
  fit,
}: {
  fit: EventPlanVenueFit | null;
}) {
  if (!fit) {
    return (
      <section
        aria-labelledby="event-plan-heading"
        className="grid gap-7 border-y border-[#D9D4C9] py-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center md:py-14"
      >
        <div>
          <p className="text-sm font-bold text-[#876946]">Plan with confidence</p>
          <h2
            id="event-plan-heading"
            className="mt-2 text-3xl font-bold tracking-[-0.025em] text-[#151C27] sm:text-4xl"
          >
            Planning an event?
          </h2>
        </div>
        <div>
          <p className="max-w-2xl text-base leading-7 text-[#5C625E] sm:text-lg sm:leading-8">
            Build an Event Plan and Venora can explain how this venue&apos;s real
            spaces and features relate to your needs.
          </p>
          <Link
            href="/plan-event"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#151C27] px-5 text-sm font-bold text-white transition-colors hover:bg-[#2C3530] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0052CC]"
          >
            Build an Event Plan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="event-plan-heading"
      className="overflow-hidden border-y border-[#CFC5B4] bg-[#EEE8DC] px-5 py-10 sm:px-8 sm:py-12"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
        <div>
          <p className="text-sm font-bold text-[#876946]">Based on your saved Event Plan</p>
          <h2
            id="event-plan-heading"
            className="mt-2 text-3xl font-bold tracking-[-0.025em] text-[#151C27] sm:text-4xl"
          >
            Imagine your event here
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-[#5C625E]">
            These notes compare your preferences with information this venue has
            actually published.
          </p>
          <Link
            href="/plan-event"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#151C27] underline decoration-[#876946] underline-offset-4 hover:text-[#0052CC]"
          >
            Review your Event Plan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div>
          {fit.explanations.length > 0 ? (
            <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {fit.explanations.map((item) => (
                <li key={item.key} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <h3 className="text-sm font-bold text-[#151C27]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#5C625E]">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex gap-3">
              <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-[#876946]" />
              <p className="max-w-xl text-sm leading-6 text-[#5C625E]">
                Your plan is saved, but this venue has not published enough
                matching information for a direct comparison yet.
              </p>
            </div>
          )}
          <p className="mt-7 border-t border-[#CFC5B4] pt-5 text-sm font-semibold text-[#5C625E]">
            {fit.confirmationNote}
          </p>
        </div>
      </div>
    </section>
  );
}

export function PropertyOverview({
  profile,
}: {
  profile: PublicVenueProfileViewModel;
}) {
  const facts = [
    profile.spaces.length > 0
      ? {
          key: "spaces",
          icon: Building2,
          value: `${profile.spaces.length} published space${profile.spaces.length === 1 ? "" : "s"}`,
        }
      : null,
    profile.gallery.length > 0
      ? {
          key: "media",
          icon: Images,
          value: `${profile.gallery.length} published photo${profile.gallery.length === 1 ? "" : "s"}`,
        }
      : null,
    profile.packages.length > 0
      ? {
          key: "packages",
          icon: Package,
          value: `${profile.packages.length} available package${profile.packages.length === 1 ? "" : "s"}`,
        }
      : null,
    profile.venue.locationLabel
      ? {
          key: "location",
          icon: MapPin,
          value: profile.venue.locationLabel,
        }
      : null,
  ].filter((fact): fact is NonNullable<typeof fact> => Boolean(fact));

  return (
    <section aria-labelledby="property-overview-heading" className="space-y-8">
      <div className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <p className="text-sm font-bold text-[#876946]">Property overview</p>
          <h2
            id="property-overview-heading"
            className="mt-2 text-3xl font-bold tracking-[-0.025em] text-[#151C27] sm:text-4xl"
          >
            Understand the venue at a glance
          </h2>
        </div>
        <p className="max-w-2xl text-base leading-7 text-[#5C625E] sm:text-lg sm:leading-8">
          Explore the property&apos;s published spaces, amenities, packages, and
          practical details before asking the venue to confirm final arrangements.
        </p>
      </div>

      {facts.length > 0 ? (
        <ul className="grid border-y border-[#D9D4C9] sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(({ key, icon: Icon, value }) => (
            <li
              key={key}
              className="flex min-h-20 items-center gap-3 border-b border-[#D9D4C9] py-4 pr-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0"
            >
              <Icon className="h-5 w-5 shrink-0 text-[#876946]" />
              <span className="text-sm font-bold leading-6 text-[#151C27]">{value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
