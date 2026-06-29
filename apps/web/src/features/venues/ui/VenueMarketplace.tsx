"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Grid,
  List,
  Search,
  MapPin,
  Users,
  Star,
  Heart,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  X,
  Sparkles,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
  Badge,
} from "@venora/ui";
import Image from "next/image";

interface VenueMarketplaceProps {
  initialVenues: any[];
}

export default function VenueMarketplace({ initialVenues }: VenueMarketplaceProps) {
  // ─── States ───
  const [venues, setVenues] = useState<any[]>(initialVenues);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [minGuests, setMinGuests] = useState<number | "">("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [indoorOutdoor, setIndoorOutdoor] = useState("all");

  // Sorting state
  const [sortBy, setSortBy] = useState("rating-desc");

  // Favorites state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Quick view state
  const [quickViewVenue, setQuickViewVenue] = useState<any | null>(null);

  // Sync favorites from LocalStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("venora_favorites");
    if (stored) {
      try {
        setFavorites(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error(e);
      }
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

  // ─── Filter & Sort Logic ───
  const filteredVenues = venues
    .filter((v) => {
      const matchesSearch =
        !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation =
        !searchLocation ||
        v.city.toLowerCase().includes(searchLocation.toLowerCase()) ||
        v.province.toLowerCase().includes(searchLocation.toLowerCase());
      const matchesGuests = !minGuests || v.capacity_max >= minGuests;
      const matchesMinPrice = !minPrice || v.base_price >= minPrice;
      const matchesMaxPrice = !maxPrice || v.base_price <= maxPrice;
      const matchesCategory = selectedCategory === "all" || v.category === selectedCategory;
      const matchesIndoor =
        indoorOutdoor === "all" ||
        (indoorOutdoor === "indoor" && v.indoor_outdoor !== "outdoor") ||
        (indoorOutdoor === "outdoor" && v.indoor_outdoor === "outdoor");

      return (
        matchesSearch &&
        matchesLocation &&
        matchesGuests &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesCategory &&
        matchesIndoor
      );
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.base_price - b.base_price;
      if (sortBy === "price-desc") return b.base_price - a.base_price;
      if (sortBy === "capacity-desc") return b.capacity_max - a.capacity_max;
      return b.avg_rating - a.avg_rating; // default: rating-desc
    });

  // ─── Paginated view slice ───
  const paginatedVenues = filteredVenues.slice(0, visibleCount);
  const hasMore = filteredVenues.length > visibleCount;

  // Mock loader for infinite scroll pagination
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 4);
      setIsLoadingMore(false);
    }, 800);
  };

  // ─── Reset Filter Action ───
  const resetFilters = () => {
    setSearchQuery("");
    setSearchLocation("");
    setMinGuests("");
    setMinPrice("");
    setMaxPrice("");
    setSelectedCategory("all");
    setIndoorOutdoor("all");
    setSortBy("rating-desc");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-10">
      {/* ─── Sidebar Filter Panel ─── */}
      <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-150 pb-4">
          <div className="flex items-center gap-2 font-display font-bold text-zinc-950">
            <SlidersHorizontal className="h-4.5 w-4.5 text-zinc-700" />
            <span>Filters</span>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Clear all
          </button>
        </div>

        {/* Location Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="e.g. Pasig, Cavite"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-9 pr-4 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
            />
          </div>
        </div>

        {/* Guest capacity filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Minimum Guests
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" />
            <input
              type="number"
              placeholder="Minimum capacity"
              value={minGuests}
              onChange={(e) => setMinGuests(e.target.value ? parseInt(e.target.value) : "")}
              className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-9 pr-4 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
            />
          </div>
        </div>

        {/* Price Bounds Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Price Range (PHP)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Min Price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value ? parseInt(e.target.value) : "")}
              className="w-full rounded-xl border border-zinc-200 bg-white py-3 px-3.5 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
            />
            <input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value ? parseInt(e.target.value) : "")}
              className="w-full rounded-xl border border-zinc-200 bg-white py-3 px-3.5 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
            />
          </div>
        </div>

        {/* Indoor/Outdoor filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Setting Mode
          </label>
          <div className="flex flex-col gap-2">
            {[
              { label: "Any Setting", value: "all" },
              { label: "Indoor (Air-Conditioned)", value: "indoor" },
              { label: "Outdoor (Garden/Beach)", value: "outdoor" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                <input
                  type="radio"
                  name="indoorOutdoor"
                  value={opt.value}
                  checked={indoorOutdoor === opt.value}
                  onChange={() => setIndoorOutdoor(opt.value)}
                  className="h-4 w-4 text-[var(--color-brand-600)] border-zinc-300 focus:ring-brand-500 cursor-pointer"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Category Tags */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Category
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { label: "All Types", value: "all" },
              { label: "Gardens", value: "garden" },
              { label: "Beaches", value: "beach" },
              { label: "Resorts", value: "resort" },
              { label: "Ballrooms", value: "hotel-ballroom" },
              { label: "Halls", value: "function-hall" },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                    isSelected
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ─── Main Content Grid/List Results ─── */}
      <div className="flex-1 space-y-6">
        {/* Results Header Action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="text-xs text-zinc-500 font-semibold">
            Showing <span className="text-zinc-900 font-extrabold">{filteredVenues.length}</span> venue listings
          </div>

          <div className="flex items-center gap-4 justify-between sm:justify-end">
            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-semibold">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px] h-9 text-xs font-semibold rounded-xl border-zinc-200 bg-white">
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-zinc-200 shadow-lg rounded-xl">
                  <SelectItem value="rating-desc" className="text-xs font-semibold">Rating (High to Low)</SelectItem>
                  <SelectItem value="price-asc" className="text-xs font-semibold">Price (Low to High)</SelectItem>
                  <SelectItem value="price-desc" className="text-xs font-semibold">Price (High to Low)</SelectItem>
                  <SelectItem value="capacity-desc" className="text-xs font-semibold">Capacity (Highest)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle buttons */}
            <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden p-0.5 bg-zinc-50">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "grid" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-700"
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "list" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-700"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content list block */}
        {filteredVenues.length === 0 ? (
          /* Empty state view */
          <div className="flex flex-col items-center justify-center py-28 text-center border border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50 space-y-4 shadow-inner">
            <AlertTriangle className="h-12 w-12 text-zinc-300" />
            <div className="space-y-1">
              <h4 className="font-display font-bold text-[15px] text-zinc-950">No venues matched your criteria</h4>
              <p className="text-xs text-zinc-500">Try widening your filters, price limits, or clearing inputs.</p>
            </div>
            <button
              onClick={resetFilters}
              className="rounded-xl border border-zinc-250 bg-white px-5 py-2.5 text-xs font-bold text-zinc-900 shadow-sm hover:bg-zinc-100 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid Layout View Mode */
          <div className="grid gap-x-6 gap-y-10 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedVenues.map((venue) => (
              <div key={venue.id} className="group block space-y-2.5 relative">
                {/* Visual Image Block */}
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
                  <Link href={`/venues/${venue.slug}`}>
                    <Image
                      src={venue.cover_image}
                      alt={venue.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </Link>

                  {/* Favorite Heart Toggle */}
                  <button
                    onClick={(e) => toggleFavorite(venue.id, e)}
                    className="absolute right-3.5 top-3.5 text-white hover:scale-105 transition-transform duration-150 focus:outline-none z-10"
                  >
                    <Heart
                      className={`h-6 w-6 stroke-white stroke-[2px] ${
                        favorites.has(venue.id) ? "fill-rose-600 stroke-rose-600" : "fill-black/30"
                      }`}
                    />
                  </button>

                  {/* Quick view button overlay */}
                  <button
                    onClick={() => setQuickViewVenue(venue)}
                    className="absolute bottom-3 right-3 rounded-full bg-white/95 p-2 text-zinc-800 shadow-md hover:bg-zinc-100 hover:text-zinc-950 hover:scale-105 transition-all focus:outline-none opacity-0 group-hover:opacity-100"
                  >
                    <Eye className="h-4.5 w-4.5" />
                  </button>

                  {/* Rating Tag Badge */}
                  {venue.avg_rating >= 4.8 && (
                    <div className="absolute left-3.5 top-3.5 rounded-full bg-white/95 px-3 py-1 text-[10px] font-black tracking-tight text-zinc-950 shadow-sm border border-zinc-150">
                      Guest favorite
                    </div>
                  )}
                </div>

                {/* Meta Labels Block */}
                <div className="space-y-1 text-xs">
                  {/* City/Province & Rating */}
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="font-extrabold text-zinc-950">
                      {venue.city}, {venue.province}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-950">
                      <Star className="h-3.5 w-3.5 fill-zinc-950 text-zinc-950" />
                      <span className="font-bold">{venue.avg_rating.toFixed(2)}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-zinc-500 font-medium text-[13px] line-clamp-1 group-hover:text-zinc-900 transition-colors">
                    <Link href={`/venues/${venue.slug}`}>{venue.name}</Link>
                  </h3>

                  {/* Guest capacity */}
                  <p className="text-zinc-400 font-normal text-[12px]">Max {venue.capacity_max} guests</p>

                  {/* Price tag */}
                  <div className="text-[13px] font-bold text-zinc-950 pt-0.5">
                    ₱{venue.base_price.toLocaleString()}
                    <span className="text-zinc-500 font-normal ml-0.5">per event</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List Layout View Mode (Horizontal Cards) */
          <div className="flex flex-col gap-6">
            {paginatedVenues.map((venue) => (
              <div
                key={venue.id}
                className="group flex flex-col md:flex-row gap-5 border border-zinc-100 rounded-2xl overflow-hidden hover:border-zinc-200 hover:shadow-md transition-all duration-300 relative bg-white"
              >
                {/* Horizontal Image Block */}
                <div className="relative aspect-[4/3] w-full md:w-72 flex-shrink-0 bg-zinc-100">
                  <Link href={`/venues/${venue.slug}`}>
                    <Image
                      src={venue.cover_image}
                      alt={venue.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                      sizes="(max-width: 768px) 100vw, 280px"
                    />
                  </Link>

                  {/* Favorite Toggle button */}
                  <button
                    onClick={(e) => toggleFavorite(venue.id, e)}
                    className="absolute right-3.5 top-3.5 text-white hover:scale-105 transition-transform duration-150 focus:outline-none z-10"
                  >
                    <Heart
                      className={`h-5.5 w-5.5 stroke-white stroke-[2px] ${
                        favorites.has(venue.id) ? "fill-rose-600 stroke-rose-600" : "fill-black/35"
                      }`}
                    />
                  </button>

                  {/* Guest Favorite Badge */}
                  {venue.avg_rating >= 4.8 && (
                    <div className="absolute left-3.5 top-3.5 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-black tracking-tight text-zinc-950 shadow-sm border border-zinc-150">
                      Favorite
                    </div>
                  )}
                </div>

                {/* Right side Text Details */}
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Location & Star */}
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
                      <span>📍 {venue.city}, {venue.province}</span>
                      <span className="flex items-center gap-1 text-zinc-950">
                        <Star className="h-3.5 w-3.5 fill-zinc-950 text-zinc-950" />
                        <span>{venue.avg_rating.toFixed(2)} ({venue.review_count})</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-display font-extrabold text-lg text-zinc-950 leading-tight group-hover:text-[var(--color-brand-600)] transition-colors">
                      <Link href={`/venues/${venue.slug}`}>{venue.name}</Link>
                    </h3>

                    {/* Description excerpt */}
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                      {venue.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4 md:mt-0 pt-3 border-t border-zinc-100">
                    <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
                      <span>Max {venue.capacity_max} guests</span>
                      <span>·</span>
                      <span className="capitalize">{venue.category}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuickViewVenue(venue)}
                        className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors focus:outline-none"
                      >
                        Quick View
                      </button>
                      <div className="text-base font-extrabold text-zinc-950">
                        ₱{venue.base_price.toLocaleString()}
                        <span className="text-zinc-500 font-normal ml-0.5 text-xs">/ event</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More pagination button & skeletons */}
        {hasMore && (
          <div className="flex flex-col items-center pt-8">
            {isLoadingMore ? (
              /* Shimmer skeletons while loading */
              <div className="w-full grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="space-y-3">
                    <div className="relative aspect-square w-full rounded-xl bg-zinc-100 skeleton" />
                    <div className="h-4 w-3/4 rounded-md skeleton" />
                    <div className="h-3 w-1/2 rounded-md skeleton" />
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={handleLoadMore}
                className="rounded-xl border border-zinc-200 bg-white px-6 py-3 text-xs font-bold text-zinc-900 shadow-sm hover:border-zinc-300 hover:bg-zinc-50 transition-colors focus:outline-none"
              >
                Show more
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Radix-driven Quick View Modal ─── */}
      <Dialog open={!!quickViewVenue} onOpenChange={(open) => !open && setQuickViewVenue(null)}>
        <DialogContent className="max-w-2xl bg-white border border-zinc-200 rounded-3xl p-0 overflow-hidden shadow-2xl animate-scale-in">
          {quickViewVenue && (
            <div className="relative">
              {/* Close Button overlay */}
              <button
                onClick={() => setQuickViewVenue(null)}
                className="absolute right-4 top-4 z-20 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 hover:scale-105 transition-all focus:outline-none"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Photo Area */}
              <div className="relative aspect-video w-full bg-zinc-100">
                <Image
                  src={quickViewVenue.cover_image}
                  alt={quickViewVenue.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-5 left-6 text-white space-y-1">
                  <Badge className="bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-600)] font-bold text-[10px] px-2.5 py-0.5">
                    {quickViewVenue.category.toUpperCase()}
                  </Badge>
                  <h3 className="font-display font-extrabold text-2xl tracking-tight leading-tight">
                    {quickViewVenue.name}
                  </h3>
                </div>
              </div>

              {/* Text Area */}
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                    <MapPin className="h-4.5 w-4.5 text-zinc-400" />
                    <span>
                      {quickViewVenue.city}, {quickViewVenue.province}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold text-zinc-900">
                    <Star className="h-4 w-4 fill-zinc-950 text-zinc-950" />
                    <span>{quickViewVenue.avg_rating.toFixed(2)}</span>
                    <span className="text-zinc-400 font-normal">({quickViewVenue.review_count} reviews)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">About the venue</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed font-sans font-medium">
                    {quickViewVenue.description}
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1 text-xs">
                    <p className="text-zinc-400 font-normal">Base price</p>
                    <p className="text-lg font-extrabold text-zinc-900">
                      ₱{quickViewVenue.base_price.toLocaleString()}
                      <span className="text-xs text-zinc-500 font-normal ml-0.5">/ event</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuickViewVenue(null)}
                      className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors focus:outline-none"
                    >
                      Close Preview
                    </button>
                    <Link
                      href={`/venues/${quickViewVenue.slug}`}
                      className="rounded-xl bg-[var(--color-brand-600)] px-6 py-3 text-xs font-bold text-white shadow-[var(--shadow-brand)] hover:bg-[var(--color-brand-700)] transition-colors"
                    >
                      View Full Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
