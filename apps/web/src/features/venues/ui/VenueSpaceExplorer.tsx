"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Accessibility,
  Building2,
  CalendarHeart,
  Check,
  LayoutGrid,
  Users,
} from "lucide-react";
import { isOptimizableImageSrc } from "@/src/lib/image-host";
import type {
  PublicVenuePackage,
  PublicVenueSpace,
} from "../application/public-venue-profile";

export function getSpaceEventFilters(spaces: PublicVenueSpace[]) {
  return [...new Set(spaces.flatMap((space) => space.eventTypes))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function filterVenueSpaces(
  spaces: PublicVenueSpace[],
  eventType: string | null,
) {
  if (!eventType) return spaces;
  return spaces.filter((space) => space.eventTypes.includes(eventType));
}

export function shouldRenderVenueJourney(spaces: PublicVenueSpace[]) {
  return spaces.filter((space) => space.name.trim()).length >= 2;
}

function capacityLabel(space: PublicVenueSpace) {
  if (space.capacityMin) {
    return `${space.capacityMin.toLocaleString("en-PH")}-${space.capacityMax.toLocaleString("en-PH")} guests`;
  }
  return `Up to ${space.capacityMax.toLocaleString("en-PH")} guests`;
}

function SpaceImage({ space }: { space: PublicVenueSpace }) {
  const image = space.media.find((item) => item.mediaType === "image") ?? null;
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-[#E6E2DA]">
      {image ? (
        <Image
          src={image.src}
          alt={image.altText}
          fill
          unoptimized={!isOptimizableImageSrc(image.src)}
          sizes="(max-width: 768px) 100vw, 42vw"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-[#77746D]">
          <Building2 className="h-9 w-9" aria-hidden="true" />
          <span className="sr-only">No published photo for {space.name}</span>
        </div>
      )}
    </div>
  );
}

export function VenueJourney({ spaces }: { spaces: PublicVenueSpace[] }) {
  if (!shouldRenderVenueJourney(spaces)) return null;

  return (
    <section aria-labelledby="venue-journey-heading" className="bg-[#17201C] px-5 py-12 text-white sm:px-8 sm:py-16 lg:px-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <div>
          <p className="text-sm font-bold text-[#D1B58A]">A flexible property journey</p>
          <h2
            id="venue-journey-heading"
            className="mt-2 text-3xl font-bold tracking-[-0.025em] sm:text-4xl"
          >
            One possible way to experience the property
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-white/70">
            Move through the venue&apos;s published spaces in a sequence that helps
            you understand the property. Your final event setup remains subject to
            venue confirmation.
          </p>
        </div>

        <ol className="border-t border-white/20">
          {spaces.map((space, index) => (
            <li
              key={space.key}
              className="grid gap-3 border-b border-white/20 py-5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center"
            >
              <span className="text-sm font-bold text-[#D1B58A]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-lg font-bold">{space.name}</h3>
                <p className="mt-1 text-sm text-white/65">
                  {space.setting} · {capacityLabel(space)}
                </p>
              </div>
              <a
                href={`#space-${space.slug}`}
                className="inline-flex min-h-11 items-center text-sm font-bold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                Explore space
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function VenueSpaceExplorer({
  spaces,
  packages,
}: {
  spaces: PublicVenueSpace[];
  packages: PublicVenuePackage[];
}) {
  const eventTypes = useMemo(() => getSpaceEventFilters(spaces), [spaces]);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const visibleSpaces = filterVenueSpaces(spaces, selectedEventType);
  const [selectedSpaceKey, setSelectedSpaceKey] = useState(spaces[0]?.key ?? "");
  const selectedSpace =
    visibleSpaces.find((space) => space.key === selectedSpaceKey) ??
    visibleSpaces[0] ??
    null;

  if (spaces.length === 0) return null;

  const relatedPackages = selectedSpace
    ? packages.filter((item) =>
        item.includedSpaces.some((space) => space.key === selectedSpace.key),
      )
    : [];

  return (
    <section id="spaces" aria-labelledby="spaces-heading" className="scroll-mt-40 space-y-8">
      <div className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <p className="text-sm font-bold text-[#876946]">Explore the property</p>
          <h2
            id="spaces-heading"
            className="mt-2 text-3xl font-bold tracking-[-0.025em] text-[#151C27] sm:text-4xl"
          >
            Find the space for your gathering
          </h2>
        </div>
        <p className="max-w-2xl text-base leading-7 text-[#5C625E] sm:text-lg sm:leading-8">
          Compare the setting, guest capacity, layouts, and published details for
          each space inside this venue.
        </p>
      </div>

      {eventTypes.length >= 2 ? (
        <div id="experiences" className="scroll-mt-40">
          <p className="mb-3 text-sm font-bold text-[#151C27]">See this venue for</p>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter spaces by event type">
            <button
              type="button"
              onClick={() => setSelectedEventType(null)}
              aria-pressed={selectedEventType === null}
              className={`min-h-11 shrink-0 rounded-lg border px-4 text-sm font-bold transition-colors ${
                selectedEventType === null
                  ? "border-[#151C27] bg-[#151C27] text-white"
                  : "border-[#CEC9BF] bg-transparent text-[#5C625E] hover:border-[#151C27]"
              }`}
            >
              All spaces
            </button>
            {eventTypes.map((eventType) => (
              <button
                key={eventType}
                type="button"
                onClick={() => {
                  setSelectedEventType(eventType);
                  const nextSpace = filterVenueSpaces(spaces, eventType)[0];
                  if (nextSpace) setSelectedSpaceKey(nextSpace.key);
                }}
                aria-pressed={selectedEventType === eventType}
                className={`min-h-11 shrink-0 rounded-lg border px-4 text-sm font-bold transition-colors ${
                  selectedEventType === eventType
                    ? "border-[#151C27] bg-[#151C27] text-white"
                    : "border-[#CEC9BF] bg-transparent text-[#5C625E] hover:border-[#151C27]"
                }`}
              >
                {eventType}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="flex gap-3 overflow-x-auto lg:flex-col" aria-label="Venue spaces">
          {visibleSpaces.map((space) => (
            <button
              key={space.key}
              type="button"
              onClick={() => setSelectedSpaceKey(space.key)}
              aria-pressed={selectedSpace?.key === space.key}
              className={`min-w-[15rem] border-l-2 px-4 py-4 text-left transition-colors lg:min-w-0 ${
                selectedSpace?.key === space.key
                  ? "border-[#876946] bg-[#EEE8DC]"
                  : "border-[#D9D4C9] hover:border-[#876946] hover:bg-white/60"
              }`}
            >
              <span className="block text-base font-bold text-[#151C27]">{space.name}</span>
              <span className="mt-1 block text-sm leading-6 text-[#5C625E]">
                {space.setting} · {capacityLabel(space)}
              </span>
            </button>
          ))}
        </div>

        {selectedSpace ? (
          <article
            id={`space-${selectedSpace.slug}`}
            className="scroll-mt-40 overflow-hidden border border-[#D9D4C9] bg-white"
          >
            <SpaceImage space={selectedSpace} />
            <div className="space-y-7 p-5 sm:p-7">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div>
                  <p className="text-sm font-bold text-[#876946]">{selectedSpace.setting}</p>
                  <h3 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#151C27] sm:text-3xl">
                    {selectedSpace.name}
                  </h3>
                  {selectedSpace.description ?? selectedSpace.shortDescription ? (
                    <p className="mt-3 max-w-2xl text-base leading-7 text-[#5C625E]">
                      {selectedSpace.description ?? selectedSpace.shortDescription}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-[#151C27]">
                  <Users className="h-5 w-5 text-[#876946]" />
                  {capacityLabel(selectedSpace)}
                </div>
              </div>

              {selectedSpace.capacityLayouts.length > 0 ? (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#151C27]">
                    <LayoutGrid className="h-4 w-4 text-[#876946]" />
                    Capacity by layout
                  </h4>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    {selectedSpace.capacityLayouts.map((layout) => (
                      <div key={`${layout.label}-${layout.capacity}`} className="border-t border-[#D9D4C9] pt-3">
                        <dt className="text-sm font-semibold text-[#5C625E]">{layout.label}</dt>
                        <dd className="mt-1 text-base font-bold text-[#151C27]">
                          {layout.capacity.toLocaleString("en-PH")} guests
                        </dd>
                        {layout.notes ? (
                          <dd className="mt-1 text-xs leading-5 text-[#77746D]">{layout.notes}</dd>
                        ) : null}
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              <div className="grid gap-6 sm:grid-cols-2">
                {selectedSpace.amenities.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-bold text-[#151C27]">Included features</h4>
                    <ul className="mt-3 space-y-2">
                      {selectedSpace.amenities.map((amenity) => (
                        <li key={amenity} className="flex gap-2 text-sm leading-6 text-[#5C625E]">
                          <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
                          {amenity}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {selectedSpace.eventTypes.length > 0 ? (
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#151C27]">
                      <CalendarHeart className="h-4 w-4 text-[#876946]" />
                      Supported events
                    </h4>
                    <p className="mt-3 text-sm leading-6 text-[#5C625E]">
                      {selectedSpace.eventTypes.join(", ")}
                    </p>
                  </div>
                ) : null}
              </div>

              {selectedSpace.accessibility ? (
                <div className="border-t border-[#D9D4C9] pt-5">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#151C27]">
                    <Accessibility className="h-4 w-4 text-[#876946]" />
                    Accessibility
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-[#5C625E]">{selectedSpace.accessibility}</p>
                </div>
              ) : null}

              {selectedSpace.restrictions || selectedSpace.operatingNotes ? (
                <div className="grid gap-5 border-t border-[#D9D4C9] pt-5 sm:grid-cols-2">
                  {selectedSpace.restrictions ? (
                    <div>
                      <h4 className="text-sm font-bold text-[#151C27]">Restrictions</h4>
                      <p className="mt-2 text-sm leading-6 text-[#5C625E]">{selectedSpace.restrictions}</p>
                    </div>
                  ) : null}
                  {selectedSpace.operatingNotes ? (
                    <div>
                      <h4 className="text-sm font-bold text-[#151C27]">Operating notes</h4>
                      <p className="mt-2 text-sm leading-6 text-[#5C625E]">{selectedSpace.operatingNotes}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {relatedPackages.length > 0 ? (
                <div className="border-t border-[#D9D4C9] pt-5">
                  <h4 className="text-sm font-bold text-[#151C27]">Packages using this space</h4>
                  <p className="mt-2 text-sm leading-6 text-[#5C625E]">
                    {relatedPackages.map((item) => item.name).join(", ")}
                  </p>
                  <a
                    href="#packages"
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[#0052CC] underline underline-offset-4"
                  >
                    View package details
                  </a>
                </div>
              ) : null}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
