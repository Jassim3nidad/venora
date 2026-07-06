"use client";

import React, { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bed,
  Building2,
  CalendarDays,
  Car,
  Check as CheckIcon,
  ChevronDown,
  Crosshair,
  Accessibility,
  Landmark,
  MapPin,
  PawPrint,
  House,
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
  municipality?: string;
  province?: string;
  basePrice?: number;
  budgetRange?: string;
  capacityMin?: number | null;
  capacityMax?: number;
  latitude?: number | null;
  longitude?: number | null;
  eventTypes?: string[];
  categories?: string[];
  amenities?: string[];
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
  "municipality",
  "location",
  "event",
  "budget",
  "minBudget",
  "maxBudget",
  "capacity",
  "style",
  "venueTypes",
  "indoorOutdoor",
  "amenities",
];

const indoorOutdoorModes = [
  { label: "Indoor", value: "indoor" },
  { label: "Outdoor", value: "outdoor" },
  { label: "Both", value: "both" },
];

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function getVenueTypeIcon(label: string) {
  const value = normalize(label);

  if (value.includes("garden")) return Trees;
  if (value.includes("beach")) return Umbrella;
  if (value.includes("resort")) return Waves;
  if (value.includes("hotel")) return Building2;
  if (value.includes("restaurant")) return House;
  if (value.includes("church")) return Landmark;

  return Building2;
}

function getAmenityIcon(label: string) {
  const value = normalize(label);

  if (value.includes("park")) return Car;
  if (value.includes("air")) return Snowflake;
  if (value.includes("pool") || value.includes("beach")) return Waves;
  if (value.includes("pet")) return PawPrint;
  if (value.includes("wheelchair") || value.includes("accessible")) {
    return Accessibility;
  }
  if (value.includes("wifi") || value.includes("wi-fi")) return Wifi;
  if (value.includes("overnight") || value.includes("accommodation")) {
    return Bed;
  }

  return CheckIcon;
}

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
        className="h-11 w-full appearance-none rounded-xl border border-[#E5E7EB] bg-white px-4 pr-10 text-left text-sm font-medium text-neutral-700 shadow-sm outline-none transition hover:border-[#2563EB] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
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
          ? "border-[#DBEAFE] bg-[#EFF6FF] text-[#2563EB]"
          : "border-[#E5E7EB] bg-white text-neutral-600 hover:border-[#2563EB] hover:text-[#2563EB]",
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
          ? "border-[#2563EB] bg-[#FFF7F4] text-[#2563EB] shadow-[0_0_0_1px_#2563EB]"
          : "border-[#E5E7EB] bg-white text-neutral-700 hover:border-[#2563EB] hover:text-[#2563EB]",
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
  const selectedMunicipality = params.get("municipality") ?? "";
  const selectedLocation = params.get("location") ?? "";
  const selectedEventType = params.get("event") ?? "";
  const selectedBudget = params.get("budget") ?? "";
  const selectedMinBudget = params.get("minBudget") ?? "";
  const selectedMaxBudget = params.get("maxBudget") ?? "";
  const selectedCapacity = params.get("capacity") ?? "";
  const selectedVenueStyle = params.get("style") ?? "";
  const selectedIndoorOutdoor = params.get("indoorOutdoor") ?? "";
  const selectedVenueTypes = useMemo(
    () =>
      (params.get("venueTypes") || selectedVenueStyle)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [params, selectedVenueStyle],
  );
  const selectedAmenities = useMemo(
    () =>
      (params.get("amenities") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [params],
  );

  const eventTypes = useMemo(
    () =>
      uniqueStrings(venues.flatMap((venue) => venue.eventTypes ?? [])).sort(),
    [venues],
  );

  const quickLocations = useMemo(
    () =>
      uniqueStrings(
        venues.flatMap((venue) => [venue.city, venue.province]),
      ).slice(0, 4),
    [venues],
  );

  const budgetTabs = useMemo(
    () =>
      uniqueStrings(venues.map((venue) => venue.budgetRange)).map((range) => ({
        label: range,
        value: range,
        range,
      })),
    [venues],
  );

  const venueTypes = useMemo(
    () =>
      uniqueStrings(
        venues.flatMap((venue) => venue.categories ?? []),
      ).map((label) => ({
        label,
        icon: getVenueTypeIcon(label),
      })),
    [venues],
  );

  const amenities = useMemo(
    () =>
      uniqueStrings(
        venues.flatMap((venue) => venue.amenities ?? []),
      ).map((label) => ({
        label,
        icon: getAmenityIcon(label),
      })),
    [venues],
  );

  const capacityBounds = useMemo(() => {
    const capacities = venues
      .map((venue) => venue.capacityMax)
      .filter((value): value is number => typeof value === "number");

    const min = Math.min(...capacities);
    const max = Math.max(...capacities);

    return {
      min: Number.isFinite(min) ? Math.max(1, Math.floor(min / 10) * 10) : 1,
      max: Number.isFinite(max) ? Math.ceil(max / 50) * 50 : 1000,
    };
  }, [venues]);

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

  const municipalityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          venues
            .filter(
              (venue) =>
                (!selectedProvince || venue.province === selectedProvince) &&
                (!selectedCity || venue.city === selectedCity),
            )
            .map((venue) => venue.municipality)
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [selectedCity, selectedProvince, venues],
  );

  const capacityValue = Number(selectedCapacity) || 0;
  const minBudgetValue = Number(selectedMinBudget) || 0;
  const maxBudgetValue = Number(selectedMaxBudget) || 0;
  const activeBudgetLabel =
    minBudgetValue || maxBudgetValue
      ? `${minBudgetValue ? `₱${minBudgetValue.toLocaleString("en-PH")}` : "Any"} - ${
          maxBudgetValue
            ? `₱${maxBudgetValue.toLocaleString("en-PH")}`
            : "No limit"
        }`
      : (budgetTabs.find((budget) => budget.value === selectedBudget)?.range ??
        "Any budget");

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

  const toggleVenueType = (venueType: string) => {
    const nextVenueTypes = selectedVenueTypes.includes(venueType)
      ? selectedVenueTypes.filter((item) => item !== venueType)
      : [...selectedVenueTypes, venueType];

    updateFilters({
      venueTypes: nextVenueTypes.join(","),
      style: "",
    });
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
      selectedMunicipality,
      selectedLocation,
      selectedEventType,
      selectedBudget || selectedMinBudget || selectedMaxBudget,
      selectedCapacity,
      selectedIndoorOutdoor,
    ].filter(Boolean).length +
    selectedVenueTypes.length +
    selectedAmenities.length;

  return (
    <aside
      className={[
        "flex h-full max-h-full flex-shrink-0 flex-col overflow-hidden bg-[#F9FAFB] shadow-sm",
        presentation === "mobile"
          ? "w-full rounded-[24px] border border-[#E5E7EB]"
          : "w-[360px] max-w-[360px] border-r border-[#E5E7EB]",
      ].join(" ")}
    >
      <div className="shrink-0 border-b border-[#E5E7EB] px-6 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#2563EB]">
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
              className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[#1D4ED8] transition hover:border-[#2563EB] hover:bg-[#EFF6FF]"
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
            className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm font-medium text-neutral-700 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>section:not(:last-child)]:mb-5">
        <section>
          <SectionTitle icon={MapPin} title="Location" />

          <div className="flex flex-col gap-2.5">
            <SelectBox
              label="Province"
              value={selectedProvince}
              options={provinceOptions}
              placeholder="Select Province"
              onChange={(value) =>
                updateFilters({
                  province: value,
                  city: "",
                  municipality: "",
                  location: "",
                })
              }
            />
            <SelectBox
              label="City"
              value={selectedCity}
              options={cityOptions}
              placeholder="Select City"
              onChange={(value) =>
                updateFilters({ city: value, municipality: "", location: "" })
              }
            />
            <SelectBox
              label="Municipality"
              value={selectedMunicipality}
              options={municipalityOptions}
              placeholder="Select Municipality"
              onChange={(value) =>
                updateFilters({ municipality: value, location: "" })
              }
            />

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-neutral-100 text-sm font-bold text-neutral-700 shadow-sm transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
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

          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
            <div className="grid grid-cols-3">
              {budgetTabs.map((budget, index) => (
                <button
                  key={budget.value}
                  type="button"
                  onClick={() =>
                    updateFilters({
                      budget:
                        selectedBudget === budget.value ? "" : budget.value,
                      minBudget: "",
                      maxBudget: "",
                    })
                  }
                  className={[
                    "h-10 text-xs font-bold transition",
                    index !== budgetTabs.length - 1
                      ? "border-r border-[#E5E7EB]"
                      : "",
                    selectedBudget === budget.value
                      ? "bg-[#EFF6FF] text-[#2563EB]"
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

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div>
              <label
                className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"
                htmlFor="min-budget-input"
              >
                Min
              </label>
              <input
                id="min-budget-input"
                type="number"
                min={0}
                step={5000}
                value={selectedMinBudget}
                onChange={(event) =>
                  updateFilters({
                    minBudget: event.target.value,
                    budget: "",
                  })
                }
                className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-neutral-800 shadow-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                placeholder="₱ min"
              />
            </div>

            <div>
              <label
                className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"
                htmlFor="max-budget-input"
              >
                Max
              </label>
              <input
                id="max-budget-input"
                type="number"
                min={0}
                step={5000}
                value={selectedMaxBudget}
                onChange={(event) =>
                  updateFilters({
                    maxBudget: event.target.value,
                    budget: "",
                  })
                }
                className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-neutral-800 shadow-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                placeholder="₱ max"
              />
            </div>
          </div>
        </section>

        <section>
          <SectionTitle icon={Users} title="Capacity" />

          <div className="flex items-center justify-between text-sm font-semibold text-neutral-500">
            <span>{capacityBounds.min}</span>
            <span>{capacityBounds.max}+</span>
          </div>

          <input
            type="range"
            min={capacityBounds.min}
            max={capacityBounds.max}
            step={10}
            value={capacityValue || Math.min(150, capacityBounds.max)}
            onChange={(event) =>
              updateFilters({ capacity: event.target.value })
            }
            className="mt-3 h-2 w-full accent-[#2563EB]"
            aria-label="Minimum guest capacity"
          />

          <div className="mt-3 flex items-center gap-3">
            <label
              className="min-w-[90px] text-sm font-medium text-neutral-500"
              htmlFor="capacity-input"
            >
              Capacity
            </label>
            <input
              id="capacity-input"
              type="number"
              min={0}
              max={capacityBounds.max}
              step={10}
              value={capacityValue || ""}
              onChange={(event) =>
                updateFilters({ capacity: event.target.value })
              }
              className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-neutral-800 shadow-sm outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
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
                className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1D4ED8] hover:text-[#2563EB]"
              >
                Reset
              </button>
            )}
          </div>
        </section>

        <section>
          <SectionTitle icon={Building2} title="Venue Type" />

          <div className="grid grid-cols-2 gap-3">
            {venueTypes.map(({ label, icon: Icon }) => {
              const active = selectedVenueTypes.includes(label);

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleVenueType(label)}
                  className={[
                    "flex aspect-[1.35] flex-col items-center justify-center gap-2 rounded-2xl border bg-white transition",
                    active
                      ? "border-[#2563EB] bg-[#FFF7F4] text-[#2563EB] shadow-[0_0_0_2px_#2563EB]"
                      : "border-[#E5E7EB] text-neutral-700 hover:border-[#2563EB] hover:text-[#2563EB]",
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
          <SectionTitle icon={Umbrella} title="Indoor / Outdoor" />

          <div className="grid grid-cols-3 gap-2.5">
            {indoorOutdoorModes.map((mode) => (
              <OptionButton
                key={mode.value}
                active={selectedIndoorOutdoor === mode.value}
                onClick={() =>
                  updateFilters({
                    indoorOutdoor:
                      selectedIndoorOutdoor === mode.value ? "" : mode.value,
                  })
                }
              >
                {mode.label}
              </OptionButton>
            ))}
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
                      ? "border-[#DBEAFE] bg-[#EFF6FF] text-[#2563EB]"
                      : "border-[#E5E7EB] bg-white text-neutral-700 hover:border-[#2563EB] hover:text-[#2563EB]",
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

      <div className="sticky bottom-0 z-10 shrink-0 border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.06)]">
        <button
          type="button"
          onClick={onApply}
          className="h-12 w-full rounded-xl bg-[#2563EB] py-3 text-base font-extrabold text-white shadow-lg shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8] active:scale-[0.98]"
        >
          View Results ({activeFilterCount})
        </button>
      </div>
    </aside>
  );
}
