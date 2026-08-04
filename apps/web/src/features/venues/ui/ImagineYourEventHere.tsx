import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Compass,
  HeartHandshake,
  LayoutTemplate,
  MapPin,
  Package,
  Sparkles,
  Users,
} from "lucide-react";
import { isOptimizableImageSrc } from "@/src/lib/image-host";
import type { EventPlanVenueFit } from "../application/event-plan-venue-fit";
import type { PublicVenueProfileViewModel } from "../application/public-venue-profile";

export function ImagineYourEventHere({
  fit,
  profile,
}: {
  fit: EventPlanVenueFit | null;
  profile: PublicVenueProfileViewModel;
}) {
  const image = profile.hero.image ?? profile.gallery[0] ?? null;

  if (!fit) {
    return (
      <section
        aria-labelledby="event-plan-heading"
        className="bg-[#17201C] text-white"
      >
        <div className="mx-auto grid max-w-[90rem] lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.8fr)]">
          <div className="px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20 xl:px-16">
            <p className="text-sm font-bold text-[#D1B58A]">
              Plan with confidence
            </p>
            <h2
              id="event-plan-heading"
              className="mt-3 max-w-2xl text-3xl font-bold tracking-[-0.025em] sm:text-5xl"
            >
              Picture your event in the right space
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
              Tell Venora about your event and see how this venue&apos;s real
              spaces, capacities, and features relate to your plans.
            </p>
            <ul className="mt-7 grid gap-4 text-sm text-white/80 sm:grid-cols-3">
              <li className="flex gap-2.5">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#D1B58A]" />
                Compare your guest count with published capacities
              </li>
              <li className="flex gap-2.5">
                <LayoutTemplate className="mt-0.5 h-5 w-5 shrink-0 text-[#D1B58A]" />
                Relate your needs to real spaces and features
              </li>
              <li className="flex gap-2.5">
                <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-[#D1B58A]" />
                Keep your event preferences together
              </li>
            </ul>
            <Link
              href="/plan-event"
              className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[#151C27] transition-colors hover:bg-[#F3EFE8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Build an Event Plan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {image ? (
            <div className="relative min-h-72 overflow-hidden lg:min-h-full">
              <Image
                src={image.src}
                alt={image.altText}
                fill
                unoptimized={!isOptimizableImageSrc(image.src)}
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
              <div
                className="absolute inset-0 bg-black/15"
                aria-hidden="true"
              />
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="event-plan-heading"
      className="overflow-hidden bg-[#EEE8DC]"
    >
      <div className="mx-auto grid max-w-[90rem] gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:px-12 xl:px-16">
        <div>
          <p className="text-sm font-bold text-[#876946]">
            Based on your saved Event Plan
          </p>
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
                    <h3 className="text-sm font-bold text-[#151C27]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[#5C625E]">
                      {item.detail}
                    </p>
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
          label: "Event spaces",
          value: `${profile.spaces.length} published space${profile.spaces.length === 1 ? "" : "s"}`,
        }
      : null,
    profile.venue.capacityMax
      ? {
          key: "capacity",
          icon: Users,
          label: "Capacity",
          value: profile.venue.capacityMin
            ? `${profile.venue.capacityMin.toLocaleString("en-PH")}-${profile.venue.capacityMax.toLocaleString("en-PH")} guests`
            : `Up to ${profile.venue.capacityMax.toLocaleString("en-PH")} guests`,
        }
      : null,
    profile.venue.setting
      ? {
          key: "setting",
          icon: Compass,
          label: "Setting",
          value: profile.venue.setting,
        }
      : null,
    profile.eventTypes.length > 0
      ? {
          key: "events",
          icon: Sparkles,
          label: "Supported events",
          value: profile.eventTypes.slice(0, 4).join(", "),
        }
      : null,
    profile.packages.length > 0
      ? {
          key: "packages",
          icon: Package,
          label: "Packages",
          value: `${profile.packages.length} available package${profile.packages.length === 1 ? "" : "s"}`,
        }
      : null,
    profile.venue.locationLabel
      ? {
          key: "location",
          icon: MapPin,
          label: "Location",
          value: profile.venue.locationLabel,
        }
      : null,
  ].filter((fact): fact is NonNullable<typeof fact> => Boolean(fact));

  return (
    <section
      aria-labelledby="property-overview-heading"
      className="bg-[#EEE8DC]"
    >
      <div className="mx-auto max-w-[90rem] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 xl:px-16">
        <div className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-end">
          <div>
            <p className="text-sm font-bold text-[#876946]">
              Property overview
            </p>
            <h2
              id="property-overview-heading"
              className="mt-2 text-3xl font-bold tracking-[-0.025em] text-[#151C27] sm:text-4xl"
            >
              Understand the venue at a glance
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-[#5C625E] sm:text-lg sm:leading-8">
            Explore the property&apos;s published spaces, amenities, packages,
            and practical details before asking the venue to confirm final
            arrangements.
          </p>
        </div>

        {facts.length > 0 ? (
          <ul className="mt-10 grid border-y border-[#C9BEAB] sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(({ key, icon: Icon, label, value }) => (
              <li
                key={key}
                className="flex min-h-28 gap-4 border-b border-[#C9BEAB] py-6 sm:px-6 lg:border-r lg:last:border-r-0"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#876946]" />
                <div>
                  <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#77746D]">
                    {label}
                  </span>
                  <span className="mt-2 block text-base font-bold leading-6 text-[#151C27]">
                    {value}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
