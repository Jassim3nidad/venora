"use client";

import React, { useState } from "react";
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

const provinces = ["Select Province", "Metro Manila", "Cavite", "Batangas", "Laguna"];
const cities = ["Select City", "Tagaytay", "BGC", "Makati", "Batangas"];

const eventTypes = ["Wedding", "Birthday", "Corporate", "Conference", "Debut", "Party"];
const quickLocations = ["Tagaytay", "BGC", "Makati", "Batangas"];
const budgetTabs = ["Under ₱100k", "₱100k–300k", "Luxury"];

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

function SelectBox({ value }: { value: string }) {
  return (
    <button
      type="button"
      className="flex h-11 w-full items-center justify-between rounded-xl border border-[#E9D5D0] bg-white px-4 text-left text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#E2765F] focus:outline-none focus:ring-2 focus:ring-[#E2765F]/20"
    >
      <span>{value}</span>
      <ChevronDown className="h-4 w-4 text-slate-500" />
    </button>
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

export default function Sidebar() {
  const [selectedLocation, setSelectedLocation] = useState("BGC");
  const [selectedEventType, setSelectedEventType] = useState("Corporate");
  const [selectedBudget, setSelectedBudget] = useState("₱100k–300k");
  const [selectedVenueStyle, setSelectedVenueStyle] = useState("Garden");
  const [selectedAmenities, setSelectedAmenities] = useState(["Aircon", "WiFi"]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity],
    );
  };

  const activeFilterCount =
    Number(Boolean(selectedLocation)) +
    Number(Boolean(selectedEventType)) +
    Number(Boolean(selectedBudget)) +
    Number(Boolean(selectedVenueStyle)) +
    selectedAmenities.length;

  return (
    <aside className="flex h-full w-[360px] max-w-[360px] flex-shrink-0 flex-col border-r border-[#E9D5D0] bg-[#FFFDFC] shadow-sm">
      {/* Header */}
      <div className="shrink-0 border-b border-[#E9D5D0] px-6 pb-4 pt-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#C7897A]">
          Filters
        </h1>

        <p className="mt-1 text-sm font-medium text-neutral-500">
          Refine your venue search
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />

          <input
            type="text"
            placeholder="Search venues..."
            className="h-11 w-full rounded-xl border border-[#E9D5D0] bg-white pl-12 pr-4 text-sm font-medium text-neutral-700 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-[#E2765F] focus:ring-4 focus:ring-[#E2765F]/10"
          />
        </div>
      </div>

      {/* Scrollable Filter Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>section:not(:last-child)]:mb-5">
        {/* Location */}
        <section>
          <SectionTitle icon={MapPin} title="Location" />

          <div className="flex flex-col gap-2.5">
            <SelectBox value={provinces[0] ?? "Select Province"} />
            <SelectBox value={cities[0] ?? "Select City"} />

            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E9D5D0] bg-neutral-100 text-sm font-bold text-neutral-700 shadow-sm transition hover:border-[#E2765F] hover:bg-[#FFF4F1] hover:text-[#E2765F]"
            >
              <Crosshair className="h-5 w-5" />
              Use my current location
            </button>

            <div className="flex flex-wrap gap-2 pt-1">
              {quickLocations.map((location) => (
                <Pill
                  key={location}
                  active={selectedLocation === location}
                  onClick={() => setSelectedLocation(location)}
                >
                  {location}
                </Pill>
              ))}
            </div>
          </div>
        </section>

        {/* Event Type */}
        <section>
          <SectionTitle icon={CalendarDays} title="Event Type" />

          <div className="grid grid-cols-2 gap-2.5">
            {eventTypes.map((type) => (
              <OptionButton
                key={type}
                active={selectedEventType === type}
                onClick={() => setSelectedEventType(type)}
              >
                {type}
              </OptionButton>
            ))}
          </div>
        </section>

        {/* Budget */}
        <section>
          <SectionTitle icon={WalletCards} title="Budget" />

          <div className="overflow-hidden rounded-xl border border-[#E9D5D0] bg-white">
            <div className="grid grid-cols-3">
              {budgetTabs.map((budget, index) => (
                <button
                  key={budget}
                  type="button"
                  onClick={() => setSelectedBudget(budget)}
                  className={[
                    "h-10 text-xs font-bold transition",
                    index !== budgetTabs.length - 1
                      ? "border-r border-[#E9D5D0]"
                      : "",
                    selectedBudget === budget
                      ? "bg-[#FFF4F1] text-[#E2765F]"
                      : "bg-white text-neutral-600 hover:bg-[#FFF9F7]",
                  ].join(" ")}
                >
                  {budget}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-3 flex justify-between text-sm font-semibold text-neutral-500">
              <span>₱50k</span>
              <span>₱500k+</span>
            </div>

            <div className="relative mx-1 h-6">
              <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-200" />
              <div className="absolute left-[20%] right-[38%] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#E2765F]" />
              <div className="absolute left-[20%] top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#E2765F] shadow-md" />
              <div className="absolute left-[62%] top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#E2765F] shadow-md" />
            </div>

            <p className="mt-2 text-center text-base font-extrabold text-neutral-700">
              ₱100,000 - ₱300,000
            </p>
          </div>
        </section>

        {/* Capacity */}
        <section>
          <SectionTitle icon={Users} title="Capacity" />

          <div className="flex justify-between text-sm font-semibold text-neutral-500">
            <span>10</span>
            <span>1000+</span>
          </div>

          <div className="mt-3 h-2 rounded-full bg-neutral-200">
            <div className="h-2 w-[45%] rounded-full bg-[#E2765F]" />
          </div>

          <p className="mt-2 text-sm font-medium text-neutral-500">
            Up to{" "}
            <span className="font-extrabold text-neutral-800">150</span>{" "}
            guests
          </p>
        </section>

        {/* Venue Style */}
        <section>
          <SectionTitle icon={Building2} title="Venue Style" />

          <div className="grid grid-cols-2 gap-3">
            {venueStyles.map(({ label, icon: Icon }) => {
              const active = selectedVenueStyle === label;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelectedVenueStyle(label)}
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

        {/* Amenities */}
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

      {/* Fixed Apply Button */}
      <div className="shrink-0 border-t border-[#E9D5D0] bg-[#FFFDFC] px-6 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.06)]">
        <button
          type="button"
          className="h-13 w-full rounded-xl bg-[#E2765F] py-3.5 text-base font-extrabold text-white shadow-lg shadow-[#E2765F]/20 transition hover:bg-[#d96851] active:scale-[0.98]"
        >
          Apply Filters ({activeFilterCount})
        </button>
      </div>
    </aside>
  );
}