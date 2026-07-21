"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  LUZON_PROVINCE_NAMES,
  getCitiesForProvince,
  getMunicipalitiesForProvince,
} from "@/data/luzon-locations";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Crosshair,
  MapPin,
  Users,
  WalletCards,
} from "lucide-react";

type FilterUpdate = Record<string, string | number | null | undefined>;

type AccordionId =
  | "location"
  | "event"
  | "budgetCapacity"
  | "venueType"
  | "amenities";

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

function uniqueStrings(values: Array<string | null | undefined>) {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

function CheckboxColumn({
  options,
  selected,
  namePrefix,
  onToggle,
}: {
  options: string[];
  selected: string[];
  namePrefix: string;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((label) => {
        const checked = selected.includes(label);
        const inputId = `${namePrefix}-${label.replace(/\s+/g, "-").toLowerCase()}`;

        return (
          <label
            key={label}
            htmlFor={inputId}
            className={[
              "flex cursor-pointer items-start gap-2.5 rounded-xl px-2 py-2 transition",
              checked ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]",
            ].join(" ")}
          >
            <input
              id={inputId}
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(label)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D1D5DB] text-[#2563EB] accent-[#2563EB] focus:ring-[#2563EB]/30"
            />
            <span
              className={[
                "text-sm font-medium leading-5",
                checked ? "text-[#1D4ED8]" : "text-[#111827]",
              ].join(" ")}
            >
              {label}
            </span>
          </label>
        );
      })}
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
        className="h-11 w-full appearance-none rounded-2xl border border-[#E5E7EB] bg-white px-4 pr-10 text-left text-sm font-medium text-[#111827] outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
    </div>
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
        "h-10 rounded-2xl border text-xs font-semibold transition",
        active
          ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] shadow-[inset_0_0_0_1px_rgba(37,99,235,0.12)]"
          : "border-[#E5E7EB] bg-white text-[#111827] hover:border-[#BFDBFE] hover:bg-[#F8FAFC] hover:text-[#2563EB]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FilterAccordion({
  id,
  title,
  icon: Icon,
  open,
  activeCount,
  summary,
  onToggle,
  children,
}: {
  id: AccordionId;
  title: string;
  icon: React.ElementType;
  open: boolean;
  activeCount: number;
  summary?: string | undefined;
  onToggle: (id: AccordionId) => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`filter-panel-${id}`}
        id={`filter-trigger-${id}`}
        onClick={() => onToggle(id)}
        className="flex w-full items-start gap-3 px-3.5 py-3.5 text-left transition hover:bg-[#F8FAFC]"
      >
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]"
          strokeWidth={2.4}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-[#111827]">{title}</h3>
            {activeCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EFF6FF] px-1.5 text-[10px] font-extrabold text-[#1D4ED8]">
                {activeCount}
              </span>
            )}
          </div>
          {!open && summary ? (
            <p className="mt-0.5 truncate text-xs font-medium text-[#6B7280]">
              {summary}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={[
            "mt-0.5 h-4 w-4 shrink-0 text-[#6B7280] transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div
          id={`filter-panel-${id}`}
          role="region"
          aria-labelledby={`filter-trigger-${id}`}
          className="border-t border-[#E5E7EB] px-3.5 pb-3.5 pt-3"
        >
          {children}
        </div>
      ) : null}
    </section>
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
  const [openAccordion, setOpenAccordion] = useState<AccordionId | null>(
    "location",
  );

  const searchQuery = params.get("q") ?? "";
  const selectedProvince = params.get("province") ?? "";
  const selectedCity = params.get("city") ?? "";
  const selectedMunicipality = params.get("municipality") ?? "";
  const selectedLocation = params.get("location") ?? "";
  const selectedEventType = params.get("event") ?? "";
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

  const venueTypes = useMemo(
    () =>
      uniqueStrings(venues.flatMap((venue) => venue.categories ?? [])).sort(),
    [venues],
  );

  const amenities = useMemo(
    () =>
      uniqueStrings(venues.flatMap((venue) => venue.amenities ?? [])).sort(),
    [venues],
  );

  const capacityMaxBound = useMemo(() => {
    const capacities = venues
      .map((venue) => venue.capacityMax)
      .filter((value): value is number => typeof value === "number");
    const max = Math.max(...capacities);
    return Number.isFinite(max) ? Math.ceil(max / 50) * 50 : 1000;
  }, [venues]);

  const provinceOptions = LUZON_PROVINCE_NAMES;

  const cityOptions = useMemo(
    () => getCitiesForProvince(selectedProvince),
    [selectedProvince],
  );

  const municipalityOptions = useMemo(
    () => getMunicipalitiesForProvince(selectedProvince),
    [selectedProvince],
  );

  const minBudgetValue = Number(selectedMinBudget) || 0;
  const maxBudgetValue = Number(selectedMaxBudget) || 0;
  const activeBudgetLabel =
    minBudgetValue || maxBudgetValue
      ? `${minBudgetValue ? `₱${minBudgetValue.toLocaleString("en-PH")}` : "Any"} - ${
          maxBudgetValue
            ? `₱${maxBudgetValue.toLocaleString("en-PH")}`
            : "No limit"
        }`
      : "Any budget";

  const updateFilters = (updates: FilterUpdate) => {
    const nextParams = new URLSearchParams(queryString);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    // Clear legacy budget presets when using min/max inputs.
    if ("minBudget" in updates || "maxBudget" in updates) {
      nextParams.delete("budget");
    }

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

  const [minBudgetDraft, setMinBudgetDraft] = useState(selectedMinBudget);
  const debouncedMinBudgetDraft = useDebouncedValue(minBudgetDraft, 300);

  const [maxBudgetDraft, setMaxBudgetDraft] = useState(selectedMaxBudget);
  const debouncedMaxBudgetDraft = useDebouncedValue(maxBudgetDraft, 300);

  useEffect(() => setMinBudgetDraft(selectedMinBudget), [selectedMinBudget]);
  useEffect(() => setMaxBudgetDraft(selectedMaxBudget), [selectedMaxBudget]);

  useEffect(() => {
    if (debouncedMinBudgetDraft !== selectedMinBudget) {
      updateFilters({ minBudget: debouncedMinBudgetDraft, budget: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMinBudgetDraft]);

  useEffect(() => {
    if (debouncedMaxBudgetDraft !== selectedMaxBudget) {
      updateFilters({ maxBudget: debouncedMaxBudgetDraft, budget: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMaxBudgetDraft]);

  const [capacityDraft, setCapacityDraft] = useState(selectedCapacity);
  const debouncedCapacityDraft = useDebouncedValue(capacityDraft, 200);

  useEffect(() => setCapacityDraft(selectedCapacity), [selectedCapacity]);

  useEffect(() => {
    if (debouncedCapacityDraft !== selectedCapacity) {
      updateFilters({ capacity: debouncedCapacityDraft });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCapacityDraft]);

  const capacityDraftValue = Number(capacityDraft) || 0;

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

  const locationActiveCount = [
    selectedProvince,
    selectedCity,
    selectedMunicipality,
    selectedLocation,
  ].filter(Boolean).length;

  const eventActiveCount = selectedEventType ? 1 : 0;

  const budgetCapacityActiveCount = [
    selectedMinBudget,
    selectedMaxBudget,
    selectedCapacity,
  ].filter(Boolean).length;

  const venueTypeActiveCount =
    selectedVenueTypes.length + (selectedIndoorOutdoor ? 1 : 0);

  const amenitiesActiveCount = selectedAmenities.length;

  const activeFilterCount =
    [
      searchQuery,
      selectedProvince,
      selectedCity,
      selectedMunicipality,
      selectedLocation,
      selectedEventType,
      selectedMinBudget || selectedMaxBudget,
      selectedCapacity,
      selectedIndoorOutdoor,
    ].filter(Boolean).length +
    selectedVenueTypes.length +
    selectedAmenities.length;

  const locationSummary =
    [selectedProvince, selectedCity, selectedMunicipality]
      .filter(Boolean)
      .join(" · ") || undefined;

  const budgetCapacitySummary = [
    selectedMinBudget || selectedMaxBudget ? activeBudgetLabel : null,
    capacityDraftValue ? `≥ ${capacityDraftValue} guests` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const venueTypeSummary = [
    selectedVenueTypes.length
      ? `${selectedVenueTypes.length} type${selectedVenueTypes.length === 1 ? "" : "s"}`
      : null,
    selectedIndoorOutdoor
      ? indoorOutdoorModes.find((mode) => mode.value === selectedIndoorOutdoor)
          ?.label
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const toggleAccordion = (id: AccordionId) => {
    setOpenAccordion((current) => (current === id ? null : id));
  };

  return (
    <aside
      className={[
        "flex h-full max-h-full flex-shrink-0 flex-col overflow-hidden bg-white",
        presentation === "mobile"
          ? "w-full rounded-[28px] border border-[#E5E7EB]"
          : "w-[300px] max-w-[300px] border-r border-[#E5E7EB]",
      ].join(" ")}
    >
      <div className="shrink-0 border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black tracking-[-0.03em] text-[#111827]">
              Filters
            </h1>

            <p className="mt-1 text-sm font-medium text-[#6B7280]">
              Refine your venue search
            </p>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-[#DBEAFE] bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[#1D4ED8] transition hover:border-[#2563EB] hover:bg-[#EFF6FF]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-gutter:stable]">
        <FilterAccordion
          id="location"
          title="Location"
          icon={MapPin}
          open={openAccordion === "location"}
          activeCount={locationActiveCount}
          summary={locationSummary}
          onToggle={toggleAccordion}
        >
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
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm font-bold text-[#6B7280] transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
            >
              <Crosshair className="h-5 w-5" />
              Use my current location
            </button>

            {locationStatus && (
              <p className="text-xs font-medium leading-5 text-[#6B7280]">
                {locationStatus}
              </p>
            )}
          </div>
        </FilterAccordion>

        <FilterAccordion
          id="event"
          title="Event Type"
          icon={CalendarDays}
          open={openAccordion === "event"}
          activeCount={eventActiveCount}
          summary={selectedEventType || undefined}
          onToggle={toggleAccordion}
        >
          <CheckboxColumn
            options={eventTypes}
            selected={selectedEventType ? [selectedEventType] : []}
            namePrefix="event-type"
            onToggle={(type) =>
              updateFilters({
                event: selectedEventType === type ? "" : type,
              })
            }
          />
        </FilterAccordion>

        <FilterAccordion
          id="budgetCapacity"
          title="Budget & Capacity"
          icon={WalletCards}
          open={openAccordion === "budgetCapacity"}
          activeCount={budgetCapacityActiveCount}
          summary={budgetCapacitySummary || undefined}
          onToggle={toggleAccordion}
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Budget
              </p>
              <p className="mb-2.5 rounded-2xl bg-[#F8FAFC] px-3 py-2 text-center text-sm font-extrabold text-[#111827]">
                {activeBudgetLabel}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
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
                    value={minBudgetDraft}
                    onChange={(event) => setMinBudgetDraft(event.target.value)}
                    className="h-10 w-full rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
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
                    value={maxBudgetDraft}
                    onChange={(event) => setMaxBudgetDraft(event.target.value)}
                    className="h-10 w-full rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                    placeholder="₱ max"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Capacity
              </p>
              <div className="flex items-center gap-3">
                <label
                  className="min-w-[72px] text-sm font-medium text-[#6B7280]"
                  htmlFor="capacity-input"
                >
                  Guests
                </label>
                <input
                  id="capacity-input"
                  type="number"
                  min={0}
                  max={capacityMaxBound}
                  step={10}
                  value={capacityDraftValue || ""}
                  onChange={(event) => setCapacityDraft(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                  placeholder="Any"
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#6B7280]">
                  {capacityDraftValue ? (
                    <>
                      At least{" "}
                      <span className="font-extrabold text-[#111827]">
                        {capacityDraftValue}
                      </span>{" "}
                      guests
                    </>
                  ) : (
                    "Any capacity"
                  )}
                </p>

                {capacityDraftValue > 0 && (
                  <button
                    type="button"
                    onClick={() => setCapacityDraft("")}
                    className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1D4ED8] hover:text-[#2563EB]"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </FilterAccordion>

        <FilterAccordion
          id="venueType"
          title="Venue Type & Indoor/Outdoor"
          icon={Building2}
          open={openAccordion === "venueType"}
          activeCount={venueTypeActiveCount}
          summary={venueTypeSummary || undefined}
          onToggle={toggleAccordion}
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Venue Type
              </p>
              <CheckboxColumn
                options={venueTypes}
                selected={selectedVenueTypes}
                namePrefix="venue-type"
                onToggle={toggleVenueType}
              />
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Indoor / Outdoor
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {indoorOutdoorModes.map((mode) => (
                  <OptionButton
                    key={mode.value}
                    active={selectedIndoorOutdoor === mode.value}
                    onClick={() =>
                      updateFilters({
                        indoorOutdoor:
                          selectedIndoorOutdoor === mode.value
                            ? ""
                            : mode.value,
                      })
                    }
                  >
                    {mode.label}
                  </OptionButton>
                ))}
              </div>
            </div>
          </div>
        </FilterAccordion>

        <FilterAccordion
          id="amenities"
          title="Amenities"
          icon={Users}
          open={openAccordion === "amenities"}
          activeCount={amenitiesActiveCount}
          summary={
            amenitiesActiveCount
              ? `${amenitiesActiveCount} selected`
              : undefined
          }
          onToggle={toggleAccordion}
        >
          <CheckboxColumn
            options={amenities}
            selected={selectedAmenities}
            namePrefix="amenity"
            onToggle={toggleAmenity}
          />
        </FilterAccordion>
      </div>

      <div className="sticky bottom-0 z-10 shrink-0 border-t border-[#E5E7EB] bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onApply}
          className={[
            "h-12 w-full rounded-2xl py-3 text-base font-extrabold transition active:scale-[0.98]",
            activeFilterCount > 0
              ? "bg-[#2563EB] text-white shadow-sm shadow-[#2563EB]/20 hover:bg-[#1D4ED8]"
              : "border border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]",
          ].join(" ")}
        >
          {activeFilterCount > 0
            ? `View Results (${activeFilterCount})`
            : "View Results"}
        </button>
      </div>
    </aside>
  );
}
