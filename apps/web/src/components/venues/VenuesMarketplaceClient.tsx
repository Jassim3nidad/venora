"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  HelpCircle,
  Heart,
  LogOut,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  CalendarDays,
  WalletCards,
  Building2,
  ChevronDown,
  Crosshair,
  Car,
  Snowflake,
  Waves,
  PawPrint,
  Wifi,
  Bed,
} from "lucide-react";

export interface Venue {
  id: string | number;
  slug?: string;
  name: string;
  location: string;
  price: string;
  capacity: string;
  image: string;
  rating?: number;
  category?: string;
  base_price: number;
  capacity_max: number;
  province: string;
  city: string;
  indoor_outdoor: string;
  air_conditioned: boolean;
  parking_available: boolean;
  overnight_accommodation: boolean;
  pet_friendly: boolean;
  wheelchair_accessible: boolean;
  has_pool: boolean;
  eventTypes: string[];
  categories: string[];
  amenities: string[];
}

interface VenuesMarketplaceClientProps {
  initialVenues: Venue[];
}

const budgetPresets = ["Under ₱100k", "₱100k-300k", "Luxury"];

const venueStyles = [
  { label: "Hotel", icon: Building2 },
  { label: "Beach", icon: Waves }, // using Waves for Beach style as per theme or Waves icon
  { label: "Garden", icon: Sparkles }, // using Sparkles or customized as trees/garden
  { label: "Resort", icon: Waves },
];

const amenitiesList = [
  { label: "Parking", icon: Car },
  { label: "Aircon", icon: Snowflake },
  { label: "Pool", icon: Waves },
  { label: "Pet Friendly", icon: PawPrint },
  { label: "WiFi", icon: Wifi },
  { label: "Overnight", icon: Bed },
];

const provincesList = ["Metro Manila", "Cavite", "Batangas", "Rizal", "Bulacan"];
const citiesByProvince: Record<string, string[]> = {
  "Metro Manila": ["Makati City", "Taguig City"],
  "Cavite": ["Tagaytay City"],
  "Batangas": ["Nasugbu"],
  "Rizal": ["Antipolo"],
  "Bulacan": ["Malolos City"],
};

export default function VenuesMarketplaceClient({ initialVenues }: VenuesMarketplaceClientProps) {
  // Unified live search - both inputs update this immediately
  const [liveSearch, setLiveSearch] = useState("");

  // --- Draft states (non-search) - applied via the Apply button ---
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedBudgetPreset, setSelectedBudgetPreset] = useState("");
  const [minBudget, setMinBudget] = useState<number | "">("");
  const [maxBudget, setMaxBudget] = useState<number | "">("");
  const [capacityLimit, setCapacityLimit] = useState<number | "">("");
  const [selectedVenueStyle, setSelectedVenueStyle] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  // --- Applied filter states (synced on Apply button click) ---
  const [appliedProvince, setAppliedProvince] = useState("");
  const [appliedCity, setAppliedCity] = useState("");
  const [appliedLocation, setAppliedLocation] = useState("");
  const [appliedEventType, setAppliedEventType] = useState("");
  const [appliedMinBudget, setAppliedMinBudget] = useState<number | "">("");
  const [appliedMaxBudget, setAppliedMaxBudget] = useState<number | "">("");
  const [appliedCapacityLimit, setAppliedCapacityLimit] = useState<number | "">("");
  const [appliedVenueStyle, setAppliedVenueStyle] = useState("");
  const [appliedAmenities, setAppliedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("recommended");
  const [favorites, setFavorites] = useState<Set<string | number>>(new Set());

  React.useEffect(() => {
    const stored = localStorage.getItem("venora_favorites");
    if (stored) {
      try {
        setFavorites(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const toggleFavorite = (venueId: string | number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = new Set(favorites);
    if (updated.has(venueId)) {
      updated.delete(venueId);
    } else {
      updated.add(venueId);
    }
    setFavorites(updated);
    localStorage.setItem("venora_favorites", JSON.stringify(Array.from(updated)));
  };

  const handleLogout = async () => {
    const { createClient: createBrowserClient } = await import("@/lib/supabase/client");
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Toggle handlers for buttons/pills
  const handleLocationPillClick = (loc: string) => {
    if (selectedLocation === loc) {
      setSelectedLocation("");
    } else {
      setSelectedLocation(loc);
    }
  };

  const handleEventTypeClick = (type: string) => {
    if (selectedEventType === type) {
      setSelectedEventType("");
    } else {
      setSelectedEventType(type);
    }
  };

  const handleBudgetPresetClick = (preset: string) => {
    if (selectedBudgetPreset === preset) {
      setSelectedBudgetPreset("");
      setMinBudget("");
      setMaxBudget("");
    } else {
      setSelectedBudgetPreset(preset);
      if (preset === "Under ₱100k") {
        setMinBudget(10000);
        setMaxBudget(100000);
      } else if (preset === "₱100k-300k") {
        setMinBudget(100000);
        setMaxBudget(300000);
      } else if (preset === "Luxury") {
        setMinBudget(300000);
        setMaxBudget(1000000);
      }
    }
  };

  const handleVenueStyleClick = (style: string) => {
    if (selectedVenueStyle === style) {
      setSelectedVenueStyle("");
    } else {
      setSelectedVenueStyle(style);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity]
    );
  };

  const handleClearFilters = () => {
    setLiveSearch("");
    setSelectedProvince("");
    setSelectedCity("");
    setSelectedLocation("");
    setSelectedEventType("");
    setSelectedBudgetPreset("");
    setMinBudget("");
    setMaxBudget("");
    setCapacityLimit("");
    setSelectedVenueStyle("");
    setSelectedAmenities([]);
    setAppliedProvince("");
    setAppliedCity("");
    setAppliedLocation("");
    setAppliedEventType("");
    setAppliedMinBudget("");
    setAppliedMaxBudget("");
    setAppliedCapacityLimit("");
    setAppliedVenueStyle("");
    setAppliedAmenities([]);
  };

  const handleApplyFilters = () => {
    setAppliedProvince(selectedProvince);
    setAppliedCity(selectedCity);
    setAppliedLocation(selectedLocation);
    setAppliedEventType(selectedEventType);
    setAppliedMinBudget(minBudget);
    setAppliedMaxBudget(maxBudget);
    setAppliedCapacityLimit(capacityLimit);
    setAppliedVenueStyle(selectedVenueStyle);
    setAppliedAmenities(selectedAmenities);
  };

  // Current active filter count (shown on Apply button)
  const activeDraftFilterCount =
    Number(Boolean(liveSearch)) +
    Number(Boolean(selectedProvince)) +
    Number(Boolean(selectedCity)) +
    Number(Boolean(selectedLocation)) +
    Number(Boolean(selectedEventType)) +
    Number(Boolean(selectedBudgetPreset || minBudget || maxBudget)) +
    Number(Boolean(capacityLimit)) +
    Number(Boolean(selectedVenueStyle)) +
    selectedAmenities.length;

  // Location pill to province/city mapping for fuzzy matching
  const locationPillMap: Record<string, { city?: string; province?: string }> = {
    tagaytay: { city: "Tagaytay City", province: "Cavite" },
    bgc: { city: "Taguig City", province: "Metro Manila" },
    makati: { city: "Makati City", province: "Metro Manila" },
    batangas: { province: "Batangas" },
  };

  // --- Filter Logic ---
  const filteredVenues = initialVenues.filter((v) => {
    // Live search - both sidebar and top-bar inputs update this in real-time
    if (liveSearch) {
      const q = liveSearch.toLowerCase();
      const match =
        v.name.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q) ||
        (v.category && v.category.toLowerCase().includes(q)) ||
        (v.city && v.city.toLowerCase().includes(q)) ||
        (v.province && v.province.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Province dropdown
    if (appliedProvince && v.province !== appliedProvince) return false;

    // City dropdown
    if (appliedCity && v.city !== appliedCity) return false;

    // Location pills - use the mapped city/province for accurate matching
    if (appliedLocation) {
      const mapped = locationPillMap[appliedLocation.toLowerCase()];
      if (mapped) {
        const cityMatch = !mapped.city || v.city === mapped.city;
        const provMatch = !mapped.province || v.province === mapped.province;
        if (mapped.city) {
          // Match by city specifically
          if (!cityMatch) return false;
        } else if (mapped.province) {
          // Match by province only
          if (!provMatch) return false;
        }
      } else {
        // Fallback fuzzy match
        const loc = appliedLocation.toLowerCase();
        const match =
          v.city.toLowerCase().includes(loc) ||
          v.province.toLowerCase().includes(loc) ||
          v.location.toLowerCase().includes(loc);
        if (!match) return false;
      }
    }

    // Event type
    if (appliedEventType) {
      const type = appliedEventType.toLowerCase();
      const match = v.eventTypes?.some((et) => et.toLowerCase() === type);
      if (!match) return false;
    }

    // Budget Min/Max bounds
    if (appliedMinBudget !== "" && v.base_price < Number(appliedMinBudget)) return false;
    if (appliedMaxBudget !== "" && v.base_price > Number(appliedMaxBudget)) return false;

    // Capacity limit
    if (appliedCapacityLimit && v.capacity_max < Number(appliedCapacityLimit)) return false;

    // Venue style
    if (appliedVenueStyle) {
      const style = appliedVenueStyle.toLowerCase();
      const match =
        v.category?.toLowerCase().includes(style) ||
        v.categories?.some((cat) => cat.toLowerCase().includes(style));
      if (!match) return false;
    }

    // Amenities
    if (appliedAmenities.length > 0) {
      const matchesAll = appliedAmenities.every((amenity) => {
        const key = amenity.toLowerCase();
        if (key === "aircon") return v.air_conditioned;
        if (key === "parking") return v.parking_available;
        if (key === "overnight") return v.overnight_accommodation;
        if (key === "pet friendly") return v.pet_friendly;
        // fallback matching in description or text list
        return v.amenities?.some((a) => a.toLowerCase().includes(key));
      });
      if (!matchesAll) return false;
    }

    return true;
  });

  // --- Sort Logic ---
  const sortedVenues = [...filteredVenues].sort((a, b) => {
    if (sortBy === "price-asc") {
      return a.base_price - b.base_price;
    }
    if (sortBy === "price-desc") {
      return b.base_price - a.base_price;
    }
    if (sortBy === "capacity-desc") {
      return b.capacity_max - a.capacity_max;
    }
    // Default recommended: Rating desc, then reviews
    const ratingA = a.rating ?? 4.8;
    const ratingB = b.rating ?? 4.8;
    return ratingB - ratingA;
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC] text-slate-950">
      {/* --- Header --- */}
      <header className="z-50 shrink-0 border-b border-[#E5E7EB]/70 bg-white/90 backdrop-blur-xl">
        <div className="relative mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-[#2563EB] transition hover:text-[#1d4ed8] sm:text-xl"
          >
            Venora
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 justify-center md:flex">
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
              <Link
                href="/venues"
                className="rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#2563EB] transition hover:text-[#1d4ed8]"
              >
                Browse
              </Link>

              <Link
                href="/bookings"
                className="rounded-full px-4 py-2 text-sm font-semibold text-[#6B7280] transition hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              >
                Bookings
              </Link>
            </div>
          </nav>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-600 lg:inline-flex"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-600 sm:inline-flex"
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            <Link
              href="/account"
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#2563EB] px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 sm:h-10 sm:px-4 sm:text-xs sm:tracking-[0.12em]"
            >
              Account
            </Link>

            <button
              onClick={handleLogout}
              aria-label="Logout"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7280] shadow-sm transition hover:border-[#E5E7EB] hover:bg-[#F9FAFB] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 sm:h-10 sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.12em]"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Content Layout --- */}
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        
        {/* --- Sidebar filter panel --- */}
        <aside className="hidden h-full w-[360px] max-w-[360px] flex-shrink-0 flex-col border-r border-[#E5E7EB] bg-[#F9FAFB] shadow-sm lg:flex">
          {/* Header */}
          <div className="shrink-0 border-b border-[#E5E7EB] px-6 pb-4 pt-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#C7897A]">
                Filters
              </h1>
              <p className="mt-1 text-sm font-medium text-neutral-500">
                Refine your venue search
              </p>
            </div>
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Clear all
            </button>
          </div>

          {/* Scrollable Filter Body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>section:not(:last-child)]:mb-5">
            {/* Search Input inside Sidebar */}
            <section className="mb-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search venues..."
                  value={liveSearch}
                  onChange={(e) => setLiveSearch(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-sm font-medium text-neutral-700 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                />
              </div>
            </section>

            {/* Location */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" strokeWidth={2.5} />
                <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Location
                </h3>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Province Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setProvinceOpen(!provinceOpen);
                      setCityOpen(false);
                    }}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 text-left text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#2563EB]"
                  >
                    <span>{selectedProvince || "Select Province"}</span>
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </button>
                  {provinceOpen && (
                    <div className="absolute left-0 right-0 z-[60] mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProvince("");
                          setSelectedCity("");
                          setProvinceOpen(false);
                        }}
                        className="flex w-full px-4 py-2 text-left text-sm hover:bg-[#EFF6FF] hover:text-[#2563EB] text-neutral-500 font-semibold"
                      >
                        Clear selection
                      </button>
                      {provincesList.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setSelectedProvince(p);
                            setSelectedCity("");
                            setProvinceOpen(false);
                          }}
                          className="flex w-full px-4 py-2 text-left text-sm hover:bg-[#EFF6FF] hover:text-[#2563EB] text-neutral-700 font-semibold"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* City Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setCityOpen(!cityOpen);
                      setProvinceOpen(false);
                    }}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 text-left text-sm font-medium text-neutral-700 shadow-sm transition hover:border-[#2563EB]"
                  >
                    <span>{selectedCity || "Select City"}</span>
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </button>
                  {cityOpen && (
                    <div className="absolute left-0 right-0 z-[60] mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCity("");
                          setCityOpen(false);
                        }}
                        className="flex w-full px-4 py-2 text-left text-sm hover:bg-[#EFF6FF] hover:text-[#2563EB] text-neutral-500 font-semibold"
                      >
                        Clear selection
                      </button>
                      {(selectedProvince ? (citiesByProvince[selectedProvince] || []) : Object.values(citiesByProvince).flat()).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setSelectedCity(c);
                            setCityOpen(false);
                          }}
                          className="flex w-full px-4 py-2 text-left text-sm hover:bg-[#EFF6FF] hover:text-[#2563EB] text-neutral-700 font-semibold"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvince("Metro Manila");
                    setSelectedCity("Taguig City");
                    setSelectedLocation("");
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-neutral-100 text-sm font-bold text-neutral-700 shadow-sm transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                >
                  <Crosshair className="h-5 w-5" />
                  Use my current location
                </button>

                <div className="flex flex-wrap gap-2 pt-1">
                  {["Tagaytay", "BGC", "Makati", "Batangas"].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => handleLocationPillClick(loc)}
                      className={[
                        "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                        selectedLocation === loc
                          ? "border-[#DBEAFE] bg-[#EFF6FF] text-[#2563EB]"
                          : "border-[#E5E7EB] bg-white text-neutral-600 hover:border-[#2563EB] hover:text-[#2563EB]",
                      ].join(" ")}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Event Type */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" strokeWidth={2.5} />
                <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Event Type
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {["Wedding", "Birthday", "Corporate", "Conference", "Debut", "Party"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleEventTypeClick(type)}
                    className={[
                      "h-10 rounded-xl border text-sm font-semibold transition",
                      selectedEventType === type
                        ? "border-[#2563EB] bg-[#FFF7F4] text-[#2563EB] shadow-[0_0_0_1px_#2563EB]"
                        : "border-[#E5E7EB] bg-white text-neutral-700 hover:border-[#2563EB] hover:text-[#2563EB]",
                    ].join(" ")}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </section>

            {/* Budget */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-slate-500" strokeWidth={2.5} />
                <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Budget
                </h3>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
                <div className="grid grid-cols-3">
                  {budgetPresets.map((budget, index) => (
                    <button
                      key={budget}
                      type="button"
                      onClick={() => handleBudgetPresetClick(budget)}
                      className={[
                        "h-10 text-xs font-bold transition",
                        index !== budgetPresets.length - 1
                          ? "border-r border-[#E5E7EB]"
                          : "",
                        selectedBudgetPreset === budget
                          ? "bg-[#EFF6FF] text-[#2563EB]"
                          : "bg-white text-neutral-600 hover:bg-[#FFF9F7]",
                      ].join(" ")}
                    >
                      {budget}
                    </button>
                  ))}
                </div>
              </div>

              {/* Range display */}
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-xs font-semibold text-neutral-500">
                  <span>₱50k</span>
                  <span>₱500k+</span>
                </div>
                <p className="text-center text-sm font-extrabold text-neutral-700">
                  ₱{(minBudget || 50000).toLocaleString("en-PH")} - ₱{(maxBudget || 300000).toLocaleString("en-PH")}
                </p>
              </div>

              {/* Manual numeric fields for budget */}
              <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Min Budget
                  </label>
                  <input
                    type="number"
                    placeholder="Min ₱"
                    value={minBudget}
                    onChange={(e) => {
                      setMinBudget(e.target.value ? Number(e.target.value) : "");
                      setSelectedBudgetPreset("");
                    }}
                    className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-neutral-700 outline-none transition focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Max Budget
                  </label>
                  <input
                    type="number"
                    placeholder="Max ₱"
                    value={maxBudget}
                    onChange={(e) => {
                      setMaxBudget(e.target.value ? Number(e.target.value) : "");
                      setSelectedBudgetPreset("");
                    }}
                    className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-neutral-700 outline-none transition focus:border-[#2563EB]"
                  />
                </div>
              </div>
            </section>

            {/* Capacity */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" strokeWidth={2.5} />
                <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Capacity
                </h3>
              </div>

              <div className="flex justify-between text-sm font-semibold text-neutral-500">
                <span>10</span>
                <span>1000+</span>
              </div>

              <input
                type="range"
                min="10"
                max="1000"
                value={capacityLimit || 150}
                onChange={(e) => setCapacityLimit(Number(e.target.value))}
                className="w-full accent-[#2563EB] h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer mt-3"
              />

              <p className="mt-2 text-sm font-medium text-neutral-500">
                Up to{" "}
                <span className="font-extrabold text-neutral-800">{capacityLimit || 150}</span>{" "}
                guests
              </p>

              {/* Manual input for capacity */}
              <div className="mt-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Manual Guest Limit
                </label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={capacityLimit}
                  onChange={(e) => setCapacityLimit(e.target.value ? Number(e.target.value) : "")}
                  className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-neutral-700 outline-none transition focus:border-[#2563EB]"
                />
              </div>
            </section>

            {/* Venue Style */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-500" strokeWidth={2.5} />
                <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Venue Style
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {venueStyles.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleVenueStyleClick(label)}
                    className={[
                      "flex aspect-[1.35] flex-col items-center justify-center gap-2 rounded-2xl border bg-white transition",
                      selectedVenueStyle === label
                        ? "border-[#2563EB] bg-[#FFF7F4] text-[#2563EB] shadow-[0_0_0_2px_#2563EB]"
                        : "border-[#E5E7EB] text-neutral-700 hover:border-[#2563EB] hover:text-[#2563EB]",
                    ].join(" ")}
                  >
                    <Icon className="h-7 w-7" strokeWidth={2.3} />
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Amenities */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" strokeWidth={2.5} />
                <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Amenities
                </h3>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {amenitiesList.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleAmenity(label)}
                    className={[
                      "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition",
                      selectedAmenities.includes(label)
                        ? "border-[#DBEAFE] bg-[#EFF6FF] text-[#2563EB]"
                        : "border-[#E5E7EB] bg-white text-neutral-700 hover:border-[#2563EB] hover:text-[#2563EB]",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.5} />
                    {label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Apply Button */}
          <div className="shrink-0 border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.06)]">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="h-13 w-full rounded-xl bg-[#2563EB] py-3.5 text-base font-extrabold text-white shadow-lg shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8] active:scale-[0.98]"
            >
              Apply Filters ({activeDraftFilterCount})
            </button>
          </div>
        </aside>

        {/* --- Main Marketplace Feed --- */}
        <main className="h-full min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">
          <div className="flex flex-col gap-8">
            
            {/* Sparkles AI banner */}
            <section className="max-w-full overflow-hidden rounded-[24px] border border-[#E5E7EB]/80 bg-white shadow-sm sm:rounded-[28px]">
              <div className="grid gap-6 p-5 sm:p-6">
                <div className="min-w-0">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[#2563EB]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
                      AI-powered venue discovery
                    </span>
                  </div>

                  <h1 className="max-w-3xl break-words text-2xl font-black leading-8 tracking-[-0.035em] text-slate-950 sm:text-4xl sm:leading-tight">
                    Wedding & Event Venues
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                    {filteredVenues.length} venue{filteredVenues.length === 1 ? "" : "s"}{" "}
                    found matching your criteria. Compare spaces, pricing, and
                    capacity in one polished marketplace.
                  </p>
                </div>

                {/* Top filter input and sorting controls */}
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="relative min-w-0">
                    <label htmlFor="venue-search" className="sr-only">
                      Search venue name
                    </label>
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="venue-search"
                      type="search"
                      placeholder="Search venue name..."
                      value={liveSearch}
                      onChange={(e) => setLiveSearch(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F9FAFB] pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-[#E5E7EB] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-[#E5E7EB] focus:border-[#2563EB] outline-none cursor-pointer pr-10 appearance-none"
                    >
                      <option value="recommended">Sort: Recommended</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="capacity-desc">Capacity: High to Low</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-500" />
                  </div>
                </div>
              </div>
            </section>

            {/* Grid of venue cards */}
            {sortedVenues.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-3xl border border-[#E5E7EB] shadow-sm">
                <p className="text-lg font-extrabold text-slate-800">No venues found matching your criteria</p>
                <p className="mt-2 text-sm text-slate-500">Try adjusting your filters or search queries.</p>
                <button
                  onClick={handleClearFilters}
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-[#2563EB] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-[#1d4ed8]"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {sortedVenues.map((venue) => {
                  const isFavorited = favorites.has(venue.id);
                  return (
                    <Link
                      key={venue.id}
                      href={`/venues/${venue.slug ?? venue.id}`}
                      className="group flex h-full overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-slate-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                    >
                      <article className="flex h-full w-full flex-col">
                        <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
                          <img
                            src={venue.image}
                            alt={venue.name}
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                          />

                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/5 to-transparent" />

                          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1D4ED8] shadow-sm backdrop-blur-md">
                            {venue.category}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(venue.id, e)}
                            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-red-500"
                            aria-label="Save to favorites"
                          >
                            <Heart className={`h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
                          </button>

                          <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-slate-800 shadow-sm backdrop-blur-md">
                            <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                            <span className="text-xs font-extrabold">
                              {venue.rating?.toFixed(1) ?? "4.8"}
                            </span>
                          </div>
                        </div>

                        <div className="flex min-h-[190px] flex-1 flex-col justify-between gap-5 p-5">
                          <div className="min-w-0">
                            <h2 className="line-clamp-1 text-lg font-extrabold leading-6 tracking-[-0.02em] text-slate-950 transition group-hover:text-[#1D4ED8]">
                              {venue.name}
                            </h2>

                            <p className="mt-2 flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-slate-500">
                              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="line-clamp-1">
                                {venue.location}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                            <div className="min-w-0">
                              <p className="text-lg font-black leading-6 text-slate-950">
                                {venue.price}
                              </p>
                              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                                starting price
                              </p>
                            </div>

                            <div className="inline-flex max-w-[60%] items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-2 text-slate-600">
                              <Users className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate text-[11px] font-extrabold uppercase tracking-[0.08em]">
                                {venue.capacity}
                              </span>
                            </div>
                          </div>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
