"use client";

import React from "react";
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
    <div className="!mb-[14px] flex items-center !gap-[8px]">
      <Icon className="!h-[16px] !w-[16px] text-slate-500" strokeWidth={2.5} />
      <h3 className="!text-[12px] !font-extrabold !leading-[16px] uppercase !tracking-[0.16em] text-slate-500">
        {title}
      </h3>
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
        "rounded-full border !px-[14px] !py-[7px] !text-[13px] !font-semibold !leading-[18px] transition",
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
        "!h-[48px] rounded-[14px] border !text-[14px] !font-semibold !leading-[20px] transition w-full",
        active
          ? "border-[#E2765F] bg-[#FFF7F4] text-[#E2765F] shadow-[0_0_0_1px_#E2765F]"
          : "border-[#E9D5D0] bg-white text-neutral-700 hover:border-[#E2765F] hover:text-[#E2765F]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export interface SidebarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedProvince: string;
  setSelectedProvince: (val: string) => void;
  selectedCity: string;
  setSelectedCity: (val: string) => void;
  selectedLocation: string;
  setSelectedLocation: (val: string) => void;
  selectedEventType: string;
  setSelectedEventType: (val: string) => void;
  selectedBudget: string;
  setSelectedBudget: (val: string) => void;
  minBudget: string;
  setMinBudget: (val: string) => void;
  maxBudget: string;
  setMaxBudget: (val: string) => void;
  capacityLimit: string;
  setCapacityLimit: (val: string) => void;
  selectedVenueStyle: string;
  setSelectedVenueStyle: (val: string) => void;
  selectedAmenities: string[];
  setSelectedAmenities: React.Dispatch<React.SetStateAction<string[]>>;
  onUseCurrentLocation: () => void;
  onClearFilters: () => void;
  provinces: string[];
  cities: string[];
  activeFilterCount: number;
}

export default function Sidebar({
  searchQuery,
  setSearchQuery,
  selectedProvince,
  setSelectedProvince,
  selectedCity,
  setSelectedCity,
  selectedLocation,
  setSelectedLocation,
  selectedEventType,
  setSelectedEventType,
  selectedBudget,
  setSelectedBudget,
  minBudget,
  setMinBudget,
  maxBudget,
  setMaxBudget,
  capacityLimit,
  setCapacityLimit,
  selectedVenueStyle,
  setSelectedVenueStyle,
  selectedAmenities,
  setSelectedAmenities,
  onUseCurrentLocation,
  onClearFilters,
  provinces,
  cities,
  activeFilterCount,
}: SidebarProps) {
  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity],
    );
  };

  return (
    <aside className="flex h-screen !w-[360px] !min-w-[360px] !max-w-[360px] flex-shrink-0 flex-col overflow-hidden border-r border-[#E9D5D0] bg-[#FFFDFC] shadow-sm">
      {/* Header */}
      <div className="border-b border-[#E9D5D0] !px-[24px] !pb-[20px] !pt-[24px]">
        <h1 className="!text-[26px] !font-extrabold !leading-[32px] !tracking-[-0.02em] text-[#C7897A]">
          Venora Filters
        </h1>

        <p className="!mt-[4px] !text-[14px] !font-medium !leading-[20px] text-neutral-500">
          Refine your venue search
        </p>

        <div className="relative !mt-[20px]">
          <Search className="absolute left-[16px] top-1/2 !h-[20px] !w-[20px] -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="!h-[48px] w-full rounded-[14px] border border-[#E9D5D0] bg-white !pl-[48px] !pr-[16px] !text-[14px] !font-medium !leading-[20px] text-neutral-700 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-[#E2765F] focus:ring-4 focus:ring-[#E2765F]/10"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto !px-[24px] !py-[28px] !pb-[112px] [&>section:not(:last-child)]:!mb-[48px]">
        {/* Location */}
        <section>
          <SectionTitle icon={MapPin} title="Location" />

          <div className="flex flex-col !gap-[12px]">
            <select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setSelectedCity(""); // clear city on province change
                setSelectedLocation(""); // clear quick location pill
              }}
              className="flex !h-[48px] w-full items-center justify-between rounded-[14px] border border-[#E9D5D0] bg-white !px-[16px] !text-left !text-[14px] !font-medium !leading-[20px] text-neutral-700 shadow-sm transition hover:border-[#E2765F] focus:outline-none focus:ring-2 focus:ring-[#E2765F]/20"
            >
              <option value="">Select Province</option>
              {provinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>

            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedLocation(""); // clear quick location pill
              }}
              disabled={!selectedProvince}
              className="flex !h-[48px] w-full items-center justify-between rounded-[14px] border border-[#E9D5D0] bg-white !px-[16px] !text-left !text-[14px] !font-medium !leading-[20px] text-neutral-700 shadow-sm transition hover:border-[#E2765F] focus:outline-none focus:ring-2 focus:ring-[#E2765F]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select City</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onUseCurrentLocation}
              className="flex !h-[48px] w-full items-center justify-center !gap-[8px] rounded-[14px] border border-[#E9D5D0] bg-neutral-100 !text-[14px] !font-bold !leading-[20px] text-neutral-700 shadow-sm transition hover:border-[#E2765F] hover:bg-[#FFF4F1] hover:text-[#E2765F]"
            >
              <Crosshair className="!h-[20px] !w-[20px]" />
              Use my current location
            </button>

            <div className="flex flex-wrap !gap-[8px] !pt-[6px]">
              {quickLocations.map((location) => (
                <Pill
                  key={location}
                  active={selectedLocation === location}
                  onClick={() => {
                    setSelectedLocation(location);
                    // Match and pre-fill province / city to BGC, Tagaytay, Makati, Batangas
                    if (location === "BGC") {
                      setSelectedProvince("Metro Manila");
                      setSelectedCity("Taguig City");
                    } else if (location === "Tagaytay") {
                      setSelectedProvince("Cavite");
                      setSelectedCity("Tagaytay City");
                    } else if (location === "Makati") {
                      setSelectedProvince("Metro Manila");
                      setSelectedCity("Makati City");
                    } else if (location === "Batangas") {
                      setSelectedProvince("Batangas");
                      setSelectedCity("");
                    }
                  }}
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

          <div className="grid grid-cols-2 !gap-[12px]">
            {eventTypes.map((type) => (
              <OptionButton
                key={type}
                active={selectedEventType === type}
                onClick={() => setSelectedEventType(selectedEventType === type ? "" : type)}
              >
                {type}
              </OptionButton>
            ))}
          </div>
        </section>

        {/* Budget */}
        <section>
          <SectionTitle icon={WalletCards} title="Budget" />

          <div className="overflow-hidden rounded-[14px] border border-[#E9D5D0] bg-white">
            <div className="grid grid-cols-3">
              {budgetTabs.map((budget, index) => (
                <button
                  key={budget}
                  type="button"
                  onClick={() => {
                    setSelectedBudget(selectedBudget === budget ? "" : budget);
                    // Automatically pre-fill min/max inputs when clicking budget tab helper
                    if (selectedBudget === budget) {
                      setMinBudget("");
                      setMaxBudget("");
                    } else if (budget === "Under ₱100k") {
                      setMinBudget("0");
                      setMaxBudget("100000");
                    } else if (budget === "₱100k–300k") {
                      setMinBudget("100000");
                      setMaxBudget("300000");
                    } else if (budget === "Luxury") {
                      setMinBudget("300000");
                      setMaxBudget("9999999");
                    }
                  }}
                  className={[
                    "!h-[40px] !text-[12px] !font-bold !leading-[16px] transition",
                    index !== budgetTabs.length - 1 ? "border-r border-[#E9D5D0]" : "",
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

          <div className="!mt-[16px]">
            <p className="!text-[12.5px] !font-bold text-neutral-500 !mb-[6px]">
              Or type budget range manually (₱):
            </p>
            <div className="flex gap-[8px] items-center">
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Min (₱)"
                  value={minBudget}
                  onChange={(e) => {
                    setMinBudget(e.target.value);
                    setSelectedBudget(""); // clear tab select when typing manually
                  }}
                  className="h-[36px] w-full rounded-[10px] border border-[#E9D5D0] bg-white px-[10px] text-[13px] font-medium text-neutral-700 outline-none transition placeholder:text-neutral-400 focus:border-[#E2765F]"
                />
              </div>
              <span className="text-[12px] font-bold text-neutral-400">—</span>
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Max (₱)"
                  value={maxBudget}
                  onChange={(e) => {
                    setMaxBudget(e.target.value);
                    setSelectedBudget(""); // clear tab select when typing manually
                  }}
                  className="h-[36px] w-full rounded-[10px] border border-[#E9D5D0] bg-white px-[10px] text-[13px] font-medium text-neutral-700 outline-none transition placeholder:text-neutral-400 focus:border-[#E2765F]"
                />
              </div>
            </div>
            {minBudget || maxBudget ? (
              <p className="!mt-[8px] text-center !text-[14px] !font-extrabold text-neutral-700">
                ₱{Number(minBudget || 0).toLocaleString()} - ₱{maxBudget ? Number(maxBudget).toLocaleString() : "500,000+"}
              </p>
            ) : (
              <p className="!mt-[8px] text-center !text-[14px] !font-extrabold text-neutral-500">
                Any Budget
              </p>
            )}
          </div>
        </section>

        {/* Capacity */}
        <section>
          <SectionTitle icon={Users} title="Capacity" />

          <div>
            <p className="!text-[12.5px] !font-bold text-neutral-500 !mb-[6px]">
              Type guest count manually:
            </p>
            <input
              type="number"
              placeholder="Enter guest count (e.g. 150)..."
              value={capacityLimit}
              onChange={(e) => setCapacityLimit(e.target.value)}
              className="h-[38px] w-full rounded-[10px] border border-[#E9D5D0] bg-white px-[12px] text-[13px] font-medium text-neutral-700 outline-none transition placeholder:text-neutral-400 focus:border-[#E2765F]"
            />
          </div>

          <p className="!mt-[10px] !text-[13px] !font-medium !leading-[18px] text-neutral-500">
            Min capacity requirement: <span className="font-extrabold text-neutral-800">{capacityLimit || "Any"}</span> guests
          </p>
        </section>

        {/* Venue Style */}
        <section>
          <SectionTitle icon={Building2} title="Venue Style" />

          <div className="grid grid-cols-2 !gap-[14px]">
            {venueStyles.map(({ label, icon: Icon }) => {
              const active = selectedVenueStyle === label;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelectedVenueStyle(selectedVenueStyle === label ? "" : label)}
                  className={[
                    "flex aspect-[1.35] flex-col items-center justify-center !gap-[10px] rounded-[18px] border bg-white transition",
                    active
                      ? "border-[#E2765F] bg-[#FFF7F4] text-[#E2765F] shadow-[0_0_0_2px_#E2765F]"
                      : "border-[#E9D5D0] text-neutral-700 hover:border-[#E2765F] hover:text-[#E2765F]",
                  ].join(" ")}
                >
                  <Icon className="!h-[30px] !w-[30px]" strokeWidth={2.3} />
                  <span className="!text-[15px] !font-semibold !leading-[20px]">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Amenities */}
        <section>
          <SectionTitle icon={Wifi} title="Amenities" />

          <div className="flex flex-wrap !gap-[10px]">
            {amenities.map(({ label, icon: Icon }) => {
              const active = selectedAmenities.includes(label);

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleAmenity(label)}
                  className={[
                    "flex items-center !gap-[8px] rounded-full border !px-[14px] !py-[9px] !text-[13px] !font-bold !leading-[18px] transition",
                    active
                      ? "border-[#F0A090] bg-[#FFF4F1] text-[#E2765F]"
                      : "border-[#E9D5D0] bg-white text-neutral-700 hover:border-[#E2765F] hover:text-[#E2765F]",
                  ].join(" ")}
                >
                  <Icon className="!h-[18px] !w-[18px]" strokeWidth={2.5} />
                  {label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="border-t border-[#E9D5D0] bg-[#FFFDFC] !px-[24px] !py-[18px] flex gap-[8px]">
        <button
          type="button"
          onClick={onClearFilters}
          className="flex-1 !h-[52px] rounded-[14px] border border-[#E9D5D0] bg-white !text-[14px] !font-bold text-neutral-600 transition hover:bg-neutral-50"
        >
          Clear
        </button>
        <button
          type="button"
          className="flex-[2] !h-[52px] rounded-[14px] bg-[#E2765F] !text-[15px] !font-extrabold !leading-[20px] text-white shadow-lg shadow-[#E2765F]/20 transition hover:bg-[#d96851] active:scale-[0.98]"
        >
          Active ({activeFilterCount})
        </button>
      </div>
    </aside>
  );
}