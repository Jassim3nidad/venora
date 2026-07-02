"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  HelpCircle,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";

export interface Venue {
  id: string;
  slug: string;
  name: string;
  location: string;
  price: string;
  capacity: string;
  image: string;
  rating: number;
  category: string;
  province: string;
  city: string;
  capacity_max: number;
  base_price: number;
  latitude: number | null;
  longitude: number | null;
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

interface BrowseClientProps {
  initialVenues: Venue[];
  userEmail?: string | null;
  userRoles?: string[];
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export default function BrowseClient({ initialVenues, userEmail, userRoles = [] }: BrowseClientProps) {
  // --- States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(""); // Location pill select
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [capacityLimit, setCapacityLimit] = useState("");
  const [selectedVenueStyle, setSelectedVenueStyle] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("recommended");

  // Load favorites from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("venora_favorites");
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.error("[BrowseClient] Error loading favorites:", e);
    }
  }, []);

  const toggleFavorite = (venueId: string, e: React.MouseEvent) => {
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

  // --- Dynamic Location Lists ---
  const provinces = Array.from(
    new Set(initialVenues.map((v) => v.province).filter(Boolean))
  ).sort() as string[];

  const cities = Array.from(
    new Set(
      initialVenues
        .filter((v) => !selectedProvince || v.province === selectedProvince)
        .map((v) => v.city)
        .filter(Boolean)
    )
  ).sort() as string[];

  // --- Geolocation ---
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Find closest venue with valid lat/long
        let closestVenue: Venue | null = null;
        let minDistance = Infinity;

        initialVenues.forEach((v) => {
          if (v.latitude !== null && v.longitude !== null) {
            const dist = getDistance(latitude, longitude, v.latitude, v.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              closestVenue = v;
            }
          }
        });

        if (closestVenue) {
          const matched = closestVenue as Venue;
          setSelectedProvince(matched.province);
          setSelectedCity(matched.city);
          setSelectedLocation("");
          alert(
            `Found closest venue: "${matched.name}" in ${matched.city}, ${matched.province}! Filters updated.`
          );
        } else {
          alert("Could not locate any nearby venues with geographic coordinates.");
        }
      },
      (error) => {
        console.error("[BrowseClient] Geolocation error:", error);
        alert("Failed to retrieve current location. Please select province/city manually.");
      }
    );
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedProvince("");
    setSelectedCity("");
    setSelectedLocation("");
    setSelectedEventType("");
    setSelectedBudget("");
    setMinBudget("");
    setMaxBudget("");
    setCapacityLimit("");
    setSelectedVenueStyle("");
    setSelectedAmenities([]);
    setSortBy("recommended");
  };

  // --- Filter Logic ---
  const filteredVenues = initialVenues.filter((v) => {
    // 1. Search Query (Matches name, description, city, or province)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = v.name?.toLowerCase().includes(q);
      const cityMatch = v.city?.toLowerCase().includes(q);
      const provMatch = v.province?.toLowerCase().includes(q);
      if (!nameMatch && !cityMatch && !provMatch) return false;
    }

    // 2. Province Filter
    if (selectedProvince && v.province !== selectedProvince) {
      return false;
    }

    // 3. City Filter
    if (selectedCity && v.city !== selectedCity) {
      return false;
    }

    // 4. Event Type Filter
    if (selectedEventType) {
      const et = selectedEventType.toLowerCase();
      const hasEventType = v.eventTypes?.some((type) => type.toLowerCase() === et);
      if (!hasEventType) return false;
    }

    // 5. Budget Filter
    const price = v.base_price;
    if (minBudget && price < Number(minBudget)) {
      return false;
    }
    if (maxBudget && price > Number(maxBudget)) {
      return false;
    }

    // 6. Capacity Filter
    if (capacityLimit && v.capacity_max < Number(capacityLimit)) {
      return false;
    }

    // 7. Venue Style Filter
    if (selectedVenueStyle) {
      const style = selectedVenueStyle.toLowerCase();
      const styleMatch =
        v.category?.toLowerCase().includes(style) ||
        v.categories?.some((cat) => cat.toLowerCase().includes(style));
      if (!styleMatch) return false;
    }

    // 8. Amenities Filter
    if (selectedAmenities.length > 0) {
      const matchesAll = selectedAmenities.every((amenity) => {
        if (amenity === "Aircon") {
          return v.air_conditioned || v.amenities?.some((a) => a.toLowerCase().includes("air"));
        }
        if (amenity === "Parking") {
          return v.parking_available || v.amenities?.some((a) => a.toLowerCase().includes("park"));
        }
        if (amenity === "Pool") {
          return v.has_pool || v.amenities?.some((a) => a.toLowerCase().includes("pool"));
        }
        if (amenity === "Pet Friendly") {
          return v.pet_friendly || v.amenities?.some((a) => a.toLowerCase().includes("pet"));
        }
        if (amenity === "WiFi") {
          return v.amenities?.some((a) => a.toLowerCase().includes("wifi"));
        }
        if (amenity === "Overnight") {
          return v.overnight_accommodation || v.amenities?.some((a) => a.toLowerCase().includes("overnight"));
        }
        return false;
      });
      if (!matchesAll) return false;
    }

    return true;
  });

  // Sort logic: Favorites always first, then chosen sortBy order
  const sortedVenues = [...filteredVenues].sort((a, b) => {
    const aFav = favorites.has(a.id);
    const bFav = favorites.has(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    if (sortBy === "price-asc") {
      return a.base_price - b.base_price;
    }
    if (sortBy === "price-desc") {
      return b.base_price - a.base_price;
    }
    if (sortBy === "capacity-desc") {
      return b.capacity_max - a.capacity_max;
    }
    // Default: Recommended (Rating descending, then name)
    const ratingDiff = b.rating - a.rating;
    if (Math.abs(ratingDiff) > 0.001) return ratingDiff;
    return a.name.localeCompare(b.name);
  });

  const activeFilterCount =
    Number(Boolean(searchQuery)) +
    Number(Boolean(selectedProvince)) +
    Number(Boolean(selectedCity)) +
    Number(Boolean(selectedEventType)) +
    Number(Boolean(minBudget || maxBudget)) +
    Number(Boolean(capacityLimit)) +
    Number(Boolean(selectedVenueStyle)) +
    selectedAmenities.length;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F8FAFC]">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 flex !h-[64px] w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 !px-[32px] backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center !gap-[6px] !text-[20px] !font-extrabold !leading-[28px] tracking-tight text-[#E07A5F]"
        >
          Venora
          <Sparkles className="!h-[16px] !w-[16px] fill-[#E07A5F] text-[#E07A5F]" />
        </Link>

        <div className="hidden h-full items-center !gap-[32px] md:flex">
          <Link
            href="/"
            className="flex h-full items-center border-b-2 border-[#E07A5F] !text-[12px] !font-bold uppercase !tracking-[0.14em] text-[#E07A5F]"
          >
            Browse
          </Link>

          <Link
            href="/bookings"
            className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
          >
            Bookings
          </Link>

          {userRoles.includes("venue_owner") && (
            <Link
              href="/dashboard"
              className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
            >
              Venue Dashboard
            </Link>
          )}

          {userRoles.includes("event_coordinator") && (
            <Link
              href="/dashboard"
              className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
            >
              Coordinator Dashboard
            </Link>
          )}

          {userRoles.includes("supplier") && (
            <Link
              href="/dashboard/supplier"
              className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
            >
              Supplier Dashboard
            </Link>
          )}

          {userRoles.includes("admin") && (
            <Link
              href="/admin"
              className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
            >
              Admin Panel
            </Link>
          )}
        </div>

        <div className="flex items-center !gap-[14px]">
          <button
            type="button"
            className="flex !h-[36px] !w-[36px] items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Notifications"
          >
            <Bell className="!h-[18px] !w-[18px]" />
          </button>

          <button
            type="button"
            className="flex !h-[36px] !w-[36px] items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Help"
          >
            <HelpCircle className="!h-[18px] !w-[18px]" />
          </button>

          <Link
            href="/account"
            className="flex !h-[38px] items-center justify-center rounded-[12px] bg-[#E07A5F] !px-[18px] !text-[12px] !font-bold uppercase !tracking-[0.12em] text-white shadow-sm transition hover:bg-[#d96851]"
          >
            Account
          </Link>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex min-h-[calc(100vh-64px)] w-full items-start overflow-hidden">
        <Sidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedProvince={selectedProvince}
          setSelectedProvince={setSelectedProvince}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          selectedEventType={selectedEventType}
          setSelectedEventType={setSelectedEventType}
          selectedBudget={selectedBudget}
          setSelectedBudget={setSelectedBudget}
          minBudget={minBudget}
          setMinBudget={setMinBudget}
          maxBudget={maxBudget}
          setMaxBudget={setMaxBudget}
          capacityLimit={capacityLimit}
          setCapacityLimit={setCapacityLimit}
          selectedVenueStyle={selectedVenueStyle}
          setSelectedVenueStyle={setSelectedVenueStyle}
          selectedAmenities={selectedAmenities}
          setSelectedAmenities={setSelectedAmenities}
          onUseCurrentLocation={handleUseCurrentLocation}
          onClearFilters={handleClearFilters}
          provinces={provinces}
          cities={cities}
          activeFilterCount={activeFilterCount}
        />

        <main className="flex-1 overflow-y-auto !px-[32px] !py-[30px] lg:!px-[40px] h-[calc(100vh-64px)]">
          {/* Header */}
          <div className="mb-[28px] flex flex-col !gap-[18px] xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-[10px] inline-flex items-center !gap-[8px] rounded-full border border-[#F0A090] bg-[#FFF4F1] !px-[12px] !py-[6px] text-[#E07A5F]">
                <Sparkles className="!h-[14px] !w-[14px]" />
                <span className="!text-[12px] !font-extrabold uppercase !tracking-[0.12em]">
                  AI-powered venue discovery
                </span>
              </div>

              <h1 className="!text-[32px] !font-black !leading-[40px] tracking-[-0.03em] text-slate-950 md:!text-[38px] md:!leading-[46px]">
                Wedding & Event Venues
              </h1>

              <p className="!mt-[6px] !pb-[14px] !font-medium !leading-[22px] text-slate-500">
                {filteredVenues.length} venue{filteredVenues.length === 1 ? "" : "s"} found matching your criteria.
              </p>
            </div>

            <div className="flex flex-col !gap-[12px] sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-[14px] top-1/2 !h-[18px] !w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search venue name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="!h-[44px] w-full rounded-[14px] border border-slate-200 bg-white !pl-[42px] !pr-[16px] !text-[14px] !font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#E07A5F] focus:ring-4 focus:ring-[#E07A5F]/10 sm:!w-[260px]"
                />
              </div>

              <div className="relative flex items-center">
                <SlidersHorizontal className="pointer-events-none absolute left-[14px] !h-[16px] !w-[16px] text-slate-600" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex !h-[44px] items-center justify-center rounded-[14px] border border-slate-200 bg-white !pl-[38px] !pr-[16px] !text-[13px] !font-bold text-slate-600 shadow-sm outline-none transition hover:border-[#E07A5F] focus:border-[#E07A5F] cursor-pointer"
                >
                  <option value="recommended">Sort: Recommended</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="capacity-desc">Capacity: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Venue Grid */}
          {filteredVenues.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-white p-[60px] text-center shadow-sm">
              <p className="text-[16px] font-bold text-slate-700">No venues match your criteria.</p>
              <p className="mt-[4px] text-[14px] text-slate-400">Try loosening your search query or clear filters to start over.</p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-[16px] rounded-[10px] bg-[#E07A5F] px-[16px] py-[8px] text-[13px] font-bold text-white transition hover:bg-[#9A442D]"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 !gap-[24px] md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 pb-[80px]">
              {sortedVenues.map((venue) => {
                const isFavorited = favorites.has(venue.id);
                return (
                  <Link
                    key={venue.id}
                    href={`/venues/${venue.slug ?? venue.id}`}
                    className="group overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#E07A5F]/40 hover:shadow-xl hover:shadow-slate-200/70"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      <img
                        src={venue.image}
                        alt={venue.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0 opacity-80" />

                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(venue.id, e)}
                        className="absolute right-[14px] top-[14px] z-10 flex !h-[38px] !w-[38px] items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-red-500"
                        aria-label="Save to favorites"
                      >
                        <Heart
                          className={`!h-[17px] !w-[17px] ${
                            isFavorited ? "fill-red-500 text-red-500" : ""
                          }`}
                        />
                      </button>

                      <div className="absolute bottom-[14px] left-[14px] flex items-center !gap-[6px] rounded-full bg-white/90 !px-[10px] !py-[6px] text-slate-800 shadow-sm backdrop-blur-md">
                        <Star className="!h-[14px] !w-[14px] fill-[#F59E0B] text-[#F59E0B]" />
                        <span className="!text-[12px] !font-extrabold">
                          {venue.rating?.toFixed(1) ?? "4.8"}
                        </span>
                      </div>
                    </div>

                    <div className="flex min-h-[172px] flex-col justify-between !gap-[18px] !p-[18px]">
                      <div>
                        <div className="mb-[10px] flex items-center justify-between !gap-[12px]">
                          <span className="rounded-full bg-[#FFF4F1] !px-[10px] !py-[5px] !text-[11px] !font-extrabold uppercase !tracking-[0.1em] text-[#E07A5F]">
                            {venue.category}
                          </span>
                        </div>

                        <h3 className="line-clamp-1 !text-[17px] !font-extrabold !leading-[24px] text-slate-950">
                          {venue.name}
                        </h3>

                        <p className="!mt-[6px] flex items-center !gap-[6px] !text-[13px] !font-medium !leading-[20px] text-slate-500">
                          <MapPin className="!h-[15px] !w-[15px] shrink-0 text-slate-400" />
                          {venue.location}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 !pt-[14px]">
                        <div>
                          <p className="!text-[18px] !font-black !leading-[24px] text-slate-950">
                            {venue.price}
                          </p>
                          <p className="!text-[12px] !font-medium !leading-[16px] text-slate-400">
                            starting price
                          </p>
                        </div>

                        <div className="flex items-center !gap-[6px] rounded-[12px] bg-slate-100 !px-[10px] !py-[8px] text-slate-600">
                          <Users className="!h-[14px] !w-[14px]" />
                          <span className="!text-[11px] !font-extrabold uppercase !tracking-[0.08em]">
                            {venue.capacity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
