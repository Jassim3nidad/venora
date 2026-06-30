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

function SelectBox({ value }: { value: string }) {
  return (
    <button
      type="button"
      className="flex !h-[48px] w-full items-center justify-between rounded-[14px] border border-[#E9D5D0] bg-white !px-[16px] !text-left !text-[14px] !font-medium !leading-[20px] text-neutral-700 shadow-sm transition hover:border-[#E2765F] focus:outline-none focus:ring-2 focus:ring-[#E2765F]/20"
    >
      <span>{value}</span>
      <ChevronDown className="!h-[16px] !w-[16px] text-slate-500" />
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
        "!h-[48px] rounded-[14px] border !text-[14px] !font-semibold !leading-[20px] transition",
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
            <SelectBox value="Select Province" />
            <SelectBox value="Select City" />

            <button
              type="button"
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

          <div className="grid grid-cols-2 !gap-[12px]">
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

          <div className="overflow-hidden rounded-[14px] border border-[#E9D5D0] bg-white">
            <div className="grid grid-cols-3">
              {budgetTabs.map((budget, index) => (
                <button
                  key={budget}
                  type="button"
                  onClick={() => setSelectedBudget(budget)}
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

          <div className="!mt-[20px]">
            <div className="!mb-[14px] flex justify-between !text-[13px] !font-semibold !leading-[18px] text-neutral-500">
              <span>₱50k</span>
              <span>₱500k+</span>
            </div>

            <div className="relative mx-[4px] !h-[28px]">
              <div className="absolute left-0 right-0 top-1/2 !h-[6px] -translate-y-1/2 rounded-full bg-neutral-200" />
              <div className="absolute left-[20%] right-[38%] top-1/2 !h-[6px] -translate-y-1/2 rounded-full bg-[#E2765F]" />
              <div className="absolute left-[20%] top-1/2 !h-[20px] !w-[20px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] border-white bg-[#E2765F] shadow-md" />
              <div className="absolute left-[62%] top-1/2 !h-[20px] !w-[20px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] border-white bg-[#E2765F] shadow-md" />
            </div>

            <p className="!mt-[10px] text-center !text-[16px] !font-extrabold !leading-[22px] text-neutral-700">
              ₱100,000 - ₱300,000
            </p>
          </div>
        </section>

        {/* Capacity */}
        <section>
          <SectionTitle icon={Users} title="Capacity" />

          <div className="flex justify-between !text-[13px] !font-semibold !leading-[18px] text-neutral-500">
            <span>10</span>
            <span>1000+</span>
          </div>

          <div className="!mt-[14px] !h-[8px] rounded-full bg-neutral-200">
            <div className="!h-[8px] w-[45%] rounded-full bg-[#E2765F]" />
          </div>

          <p className="!mt-[10px] !text-[13px] !font-medium !leading-[18px] text-neutral-500">
            Up to <span className="font-extrabold text-neutral-800">150</span> guests
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
                  onClick={() => setSelectedVenueStyle(label)}
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
          <SectionTitle icon={Users} title="Amenities" />

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
      <div className="border-t border-[#E9D5D0] bg-[#FFFDFC] !px-[24px] !py-[18px]">
        <button
          type="button"
          className="!h-[52px] w-full rounded-[14px] bg-[#E2765F] !text-[15px] !font-extrabold !leading-[20px] text-white shadow-lg shadow-[#E2765F]/20 transition hover:bg-[#d96851] active:scale-[0.98]"
        >
          Apply Filters ({activeFilterCount})
        </button>
      </div>
    </aside>
  );
}