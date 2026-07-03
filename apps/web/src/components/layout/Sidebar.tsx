"use client";

import React, { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bed,
  Building2,
  CalendarDays,
  Car,
  ChevronDown,
  Crosshair,
  MapPin,
  PawPrint,
  Search,
  Snowflake,
  Trees,
  Umbrella,
  Users,
  WalletCards,
  Waves,
  Wifi,
} from "lucide-react";

type FilterUpdate = Record<string, string | number | null | undefined>;

interface VenueFilterSource {
  id: string | number;
  name: string;
  location: string;
  city?: string;
  province?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface SidebarProps {
  venues?: VenueFilterSource[];
  presentation?: "desktop" | "mobile";
  onApply?: () => void;
}

const filterKeys = [
  "q",
  "province",
  "city",
  "location",
  "event",
  "budget",
  "capacity",
  "style",
  "amenities",
];

const eventTypes = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Conference",
  "Debut",
  "Party",
];
const quickLocations = ["Tagaytay", "BGC", "Makati", "Batangas"];

const budgetTabs = [
  { label: "Under ₱100k", value: "under-100k", range: "Below ₱100,000" },
  { label: "₱100k-300k", value: "100k-300k", range: "₱100,000 - ₱300,000" },
  { label: "Luxury", value: "luxury", range: "Above ₱300,000" },
];

const venueStyles = [
  { label: "Hotel", icon: Building2 },
  { label: "Beach", icon: Umbrella },
  { label: "Garden", icon: Trees },
  { label: "Resort", icon: Waves },
];

const amenities = [
  { label: "Parking", icon: Car },
  { label: "Aircon", icon: Snowflake },
  { label: "Pool", icon: Waves },
  { label: "Pet Friendly", icon: PawPrint },
  { label: "WiFi", icon: Wifi },
  { label: "Overnight", icon: Bed },
];

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-slate-500" strokeWidth={2.5} />
      <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </h3>
    </div>
  );
}

function SelectBox({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <label className="sr-only">{label}</label>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-[#E9D5D0] bg-white px-4 pr-10 text-left text-sm font-medium text-neutral-700 shadow-sm outline-none transition hover:border-[#E2765F] focus:border-[#E2765F] focus:ring-4 focus:ring-[#E2765F]/10"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

function Pill({
  children,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "border-[#F0A090] bg-[#FFF4F1] text-[#E2765F]"
          : "border-[#E9D5D0] bg-white text-neutral-600 hover:border-[#E2765F] hover:text-[#E2765F]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function OptionButton({
  children,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-10 rounded-xl border text-sm font-semibold transition",
        active
          ? "border-[#E2765F] bg-[#FFF7F4] text-[#E2765F] shadow-[0_0_0_1px_#E2765F]"
          : "border-[#E9D5D0] bg-white text-neutral-700 hover:border-[#E2765F] hover:text-[#E2765F]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return radius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function Sidebar({
  venues = [],
  presentation = "desktop",
  onApply,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const params = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const [locationStatus, setLocationStatus] = useState("");

  const searchQuery = params.get("q") ?? "";
  const selectedProvince = params.get("province") ?? "";
  const selectedCity = params.get("city") ?? "";
  const selectedLocation = params.get("location") ?? "";
  const selectedEventType = params.get("event") ?? "";
  const selectedBudget = params.get("budget") ?? "";
  const selectedCapacity = params.get("capacity") ?? "";
  const selectedVenueStyle = params.get("style") ?? "";
  const selectedAmenities = useMemo(
    () =>
      (params.get("amenities") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [params],
  );

  const provinceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          venues.map((venue) => venue.province).filter(Boolean) as string[],
        ),
      ).sort(),
    [venues],
  );

  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          venues
            .filter(
              (venue) =>
                !selectedProvince || venue.province === selectedProvince,
            )
            .map((venue) => venue.city)
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [selectedProvince, venues],
  );

  const capacityValue = Number(selectedCapacity) || 0;
  const activeBudgetLabel =
    budgetTabs.find((budget) => budget.value === selectedBudget)?.range ??
    "Any budget";

  const updateFilters = (updates: FilterUpdate) => {
    const nextParams = new URLSearchParams(queryString);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const clearFilters = () => {
    const nextParams = new URLSearchParams(queryString);
    filterKeys.forEach((key) => nextParams.delete(key));

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const toggleAmenity = (amenity: string) => {
    const nextAmenities = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter((item) => item !== amenity)
      : [...selectedAmenities, amenity];

    updateFilters({ amenities: nextAmenities.join(",") });
  };

  const handleUseCurrentLocation = () => {
    const venuesWithCoordinates = venues.filter(
      (venue) =>
        typeof venue.latitude === "number" &&
        typeof venue.longitude === "number",
    );

    if (!navigator.geolocation) {
      setLocationStatus("Location is not available in this browser.");
      return;
    }

    if (venuesWithCoordinates.length === 0) {
      setLocationStatus("No venues include map coordinates yet.");
      return;
    }

    setLocationStatus("Finding nearby venues...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const closest = venuesWithCoordinates.reduce(
          (nearest, venue) => {
            const venueDistance = getDistance(
              position.coords.latitude,
              position.coords.longitude,
              venue.latitude as number,
              venue.longitude as number,
            );

            if (!nearest || venueDistance < nearest.distance) {
              return { venue, distance: venueDistance };
            }

            return nearest;
          },
          null as { venue: VenueFilterSource; distance: number } | null,
        );

        if (!closest) {
          setLocationStatus("No nearby venues found.");
          return;
        }

        updateFilters({
          province: closest.venue.province,
          city: closest.venue.city,
          location: "",
        });
        setLocationStatus(`Nearest match: ${closest.venue.location}`);
      },
      () => {
        setLocationStatus("Location access was not allowed.");
      },
    );
  };

  const activeFilterCount =
    [
      searchQuery,
      selectedProvince,
      selectedCity,
      selectedLocation,
      selectedEventType,
      selectedBudget,
      selectedCapacity,
      selectedVenueStyle,
    ].filter(Boolean).length + selectedAmenities.length;

  return (
    <aside
      className={[
        "flex flex-shrink-0 flex-col bg-[#FFFDFC] shadow-sm",
        presentation === "mobile"
          ? "h-full w-full rounded-t-[28px] border border-[#E9D5D0]"
          : "h-full w-[360px] max-w-[360px] border-r border-[#E9D5D0]",
      ].join(" ")}
    >
      <div className="shrink-0 border-b border-[#E9D5D0] px-6 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#C7897A]">
              Filters
            </h1>

            <p className="mt-1 text-sm font-medium text-neutral-500">
              Refine your venue search
            </p>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-[#E9D5D0] bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[#9A442D] transition hover:border-[#E2765F] hover:bg-[#FFF4F1]"
            >
              Clear
            </button>
          )}
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => updateFilters({ q: event.target.value })}
            placeholder="Search venues..."
            className="h-11 w-full rounded-xl border border-[#E9D5D0] bg-white pl-12 pr-4 text-sm font-medium text-neutral-700 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-[#E2765F] focus:ring-4 focus:ring-[#E2765F]/10"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>section:not(:last-child)]:mb-5">
        <section>
          <SectionTitle icon={MapPin} title="Location" />

          <div className="flex flex-col gap-2.5">
            <SelectBox
              label="Province"
              value={selectedProvince}
              options={provinceOptions}
              placeholder="Select Province"
              onChange={(value) =>
                updateFilters({ province: value, city: "", location: "" })
              }
            />
            <SelectBox
              label="City"
              value={selectedCity}
              options={cityOptions}
              placeholder="Select City"
              onChange={(value) => updateFilters({ city: value, location: "" })}
            />

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E9D5D0] bg-neutral-100 text-sm font-bold text-neutral-700 shadow-sm transition hover:border-[#E2765F] hover:bg-[#FFF4F1] hover:text-[#E2765F]"
            >
              <Crosshair className="h-5 w-5" />
              Use my current location
            </button>

            {locationStatus && (
              <p className="text-xs font-medium leading-5 text-neutral-500">
                {locationStatus}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {quickLocations.map((location) => (
                <Pill
                  key={location}
                  active={selectedLocation === location}
                  onClick={() =>
                    updateFilters({
                      location: selectedLocation === location ? "" : location,
                      province: "",
                      city: "",
                    })
                  }
                >
                  {location}
                </Pill>
              ))}
            </div>
          </div>
        </section>

        <section>
          <SectionTitle icon={CalendarDays} title="Event Type" />

          <div className="grid grid-cols-2 gap-2.5">
            {eventTypes.map((type) => (
              <OptionButton
                key={type}
                active={selectedEventType === type}
                onClick={() =>
                  updateFilters({
                    event: selectedEventType === type ? "" : type,
                  })
                }
              >
                {type}
              </OptionButton>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle icon={WalletCards} title="Budget" />

          <div className="overflow-hidden rounded-xl border border-[#E9D5D0] bg-white">
            <div className="grid grid-cols-3">
              {budgetTabs.map((budget, index) => (
                <button
                  key={budget.value}
                  type="button"
                  onClick={() =>
                    updateFilters({
                      budget:
                        selectedBudget === budget.value ? "" : budget.value,
                    })
                  }
                  className={[
                    "h-10 text-xs font-bold transition",
                    index !== budgetTabs.length - 1
                      ? "border-r border-[#E9D5D0]"
                      : "",
                    selectedBudget === budget.value
                      ? "bg-[#FFF4F1] text-[#E2765F]"
                      : "bg-white text-neutral-600 hover:bg-[#FFF9F7]",
                  ].join(" ")}
                >
                  {budget.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 text-center text-sm font-extrabold text-neutral-700">
            {activeBudgetLabel}
          </p>
        </section>

        <section>
          <SectionTitle icon={Users} title="Capacity" />

          <div className="flex items-center justify-between text-sm font-semibold text-neutral-500">
            <span>50</span>
            <span>1000+</span>
          </div>

          <input
            type="range"
            min={50}
            max={1000}
            step={50}
            value={capacityValue || 150}
            onChange={(event) =>
              updateFilters({ capacity: event.target.value })
            }
            className="mt-3 h-2 w-full accent-[#E2765F]"
            aria-label="Minimum guest capacity"
          />

          <div className="mt-3 flex items-center gap-3">
            <label className="min-w-[90px] text-sm font-medium text-neutral-500" htmlFor="capacity-input">
              Capacity
            </label>
            <input
              id="capacity-input"
              type="number"
              min={0}
              max={1000}
              step={10}
              value={capacityValue || ""}
              onChange={(event) =>
                updateFilters({ capacity: event.target.value })
              }
              className="h-11 w-full rounded-xl border border-[#E9D5D0] bg-white px-3 text-sm font-semibold text-neutral-800 shadow-sm outline-none transition focus:border-[#E2765F] focus:ring-4 focus:ring-[#E2765F]/10"
              placeholder="Any"
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-neutral-500">
              {capacityValue ? (
                <>
                  At least{" "}
                  <span className="font-extrabold text-neutral-800">
                    {capacityValue}
                  </span>{" "}
                  guests
                </>
              ) : (
                "Any capacity"
              )}
            </p>

            {capacityValue > 0 && (
              <button
                type="button"
                onClick={() => updateFilters({ capacity: "" })}
                className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#9A442D] hover:text-[#E2765F]"
              >
                Reset
              </button>
            )}
          </div>
        </section>

        <section>
          <SectionTitle icon={Building2} title="Venue Style" />

          <div className="grid grid-cols-2 gap-3">
            {venueStyles.map(({ label, icon: Icon }) => {
              const active = selectedVenueStyle === label;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => updateFilters({ style: active ? "" : label })}
                  className={[
                    "flex aspect-[1.35] flex-col items-center justify-center gap-2 rounded-2xl border bg-white transition",
                    active
                      ? "border-[#E2765F] bg-[#FFF7F4] text-[#E2765F] shadow-[0_0_0_2px_#E2765F]"
                      : "border-[#E9D5D0] text-neutral-700 hover:border-[#E2765F] hover:text-[#E2765F]",
                  ].join(" ")}
                >
                  <Icon className="h-7 w-7" strokeWidth={2.3} />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle icon={Users} title="Amenities" />

          <div className="flex flex-wrap gap-2.5">
            {amenities.map(({ label, icon: Icon }) => {
              const active = selectedAmenities.includes(label);

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleAmenity(label)}
                  className={[
                    "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition",
                    active
                      ? "border-[#F0A090] bg-[#FFF4F1] text-[#E2765F]"
                      : "border-[#E9D5D0] bg-white text-neutral-700 hover:border-[#E2765F] hover:text-[#E2765F]",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                  {label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="shrink-0 border-t border-[#E9D5D0] bg-[#FFFDFC] px-6 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.06)]">
        <button
          type="button"
          onClick={onApply}
          className="h-12 w-full rounded-xl bg-[#E2765F] py-3 text-base font-extrabold text-white shadow-lg shadow-[#E2765F]/20 transition hover:bg-[#d96851] active:scale-[0.98]"
        >
          View Results ({activeFilterCount})
        </button>
      </div>
    </aside>
  );
}
