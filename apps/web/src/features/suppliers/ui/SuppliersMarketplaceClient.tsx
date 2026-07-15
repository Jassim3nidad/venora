"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEventHandler,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  BadgeCheck,
  BriefcaseBusiness,
  ChevronDown,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import type {
  SupplierCategory,
  SupplierMarketplaceProfile,
} from "../types/supplier.types";
import {
  getSupplierHeroImage,
  getSupplierStartingPrice,
  supplierSearchText,
} from "../utils/supplier-derive";
import {
  formatPriceUnit,
  formatRating,
  formatResponseTime,
  formatSupplierPrice,
} from "../utils/supplier-format";

const PAGE_SIZE = 12;

type SortValue = "recommended" | "rating" | "price" | "newest";

type SuppliersMarketplaceClientProps = {
  initialSuppliers: SupplierMarketplaceProfile[];
  categories: SupplierCategory[];
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function FilterSelect({
  value,
  onChange,
  children,
  bold = false,
}: {
  value: string;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  children: ReactNode;
  bold?: boolean;
}) {
  return (
    <span className="relative block">
      <select
        value={value}
        onChange={onChange}
        className={`h-12 w-full appearance-none rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-3 pr-10 text-sm ${bold ? "font-bold" : "font-semibold"} text-slate-700 outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
    </span>
  );
}

function SupplierCard({ supplier }: { supplier: SupplierMarketplaceProfile }) {
  const startingPrice = getSupplierStartingPrice(supplier);
  const priceUnit =
    supplier.packages.find((pkg) => pkg.price === startingPrice)?.priceUnit ??
    supplier.priceUnit;
  const image = getSupplierHeroImage(supplier);
  const topAreas = supplier.serviceAreas.slice(0, 3);

  return (
    <article className="group flex h-full overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70 transition duration-300 hover:-translate-y-1 hover:border-[#BFDBFE] hover:shadow-xl hover:shadow-slate-200/80">
      <Link
        href={`/suppliers/${supplier.slug}`}
        className="flex min-w-0 flex-1 flex-col"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#EFF6FF]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={supplier.businessName}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#111827]/55 to-transparent" />
          <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5" />
            Accredited
          </div>
          {supplier.isFeatured ? (
            <div className="absolute right-4 top-4 rounded-full bg-[#111827]/85 px-3 py-1.5 text-xs font-extrabold text-white">
              Featured
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {supplier.category ? (
                <span className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1 text-xs font-extrabold text-[#1D4ED8]">
                  {supplier.category.name}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {formatRating(supplier.avgRating, supplier.reviewCount)}
              </span>
            </div>

            <h2 className="text-lg font-black leading-6 tracking-[-0.03em] text-[#111827] transition group-hover:text-[#1D4ED8]">
              {supplier.businessName}
            </h2>
            {supplier.headline ? (
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-[#6B7280]">
                {supplier.headline}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2.5 text-sm text-[#6B7280]">
            <div className="flex min-w-0 items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
              <span className="min-w-0 truncate font-semibold">
                {supplier.publicLocationLabel
                  ? supplier.publicLocationLabel
                  : [supplier.city, supplier.province].filter(Boolean).length >
                      0
                    ? [supplier.city, supplier.province]
                        .filter(Boolean)
                        .join(", ")
                    : topAreas.length > 0
                      ? topAreas.join(", ")
                      : "Service area on request"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[#2563EB]" />
              <span className="font-semibold">
                {formatResponseTime(supplier.responseTimeHours)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-[#2563EB]" />
              <span className="font-semibold">
                {supplier.yearsInBusiness
                  ? `${supplier.yearsInBusiness}+ years in business`
                  : "Flexible packages"}
              </span>
            </div>
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#E5E7EB] pt-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
                Starts at
              </p>
              <p className="text-lg font-black text-slate-950">
                {formatSupplierPrice(startingPrice)}
              </p>
              {startingPrice ? (
                <p className="text-xs font-semibold text-slate-500">
                  {formatPriceUnit(priceUnit)}
                </p>
              ) : null}
            </div>
            <span className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#2563EB] px-4 text-xs font-black uppercase tracking-[0.08em] text-white shadow-sm shadow-[#2563EB]/20 transition group-hover:bg-[#1D4ED8]">
              View Details
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function SuppliersMarketplaceClient({
  initialSuppliers,
  categories,
}: SuppliersMarketplaceClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [sort, setSort] = useState<SortValue>("recommended");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const locations = useMemo(
    () =>
      [
        ...new Set(
          initialSuppliers.flatMap((supplier) => supplier.serviceAreas),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [initialSuppliers],
  );

  const filteredSuppliers = useMemo(() => {
    const q = normalize(query);
    const selectedCategory = normalize(category);
    const selectedLocation = normalize(location);
    const priceLimit = Number(maxPrice) || 0;
    const ratingFloor = Number(minRating) || 0;

    return initialSuppliers
      .filter((supplier) => {
        if (q && !supplierSearchText(supplier).includes(q)) return false;
        if (
          selectedCategory !== "all" &&
          supplier.category?.slug !== selectedCategory
        ) {
          return false;
        }
        if (
          selectedLocation &&
          !supplier.serviceAreas.some(
            (area) => normalize(area) === selectedLocation,
          )
        ) {
          return false;
        }
        if (ratingFloor > 0 && supplier.avgRating < ratingFloor) return false;
        if (priceLimit > 0) {
          const startingPrice = getSupplierStartingPrice(supplier);
          if (!startingPrice || startingPrice > priceLimit) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sort === "rating") return b.avgRating - a.avgRating;
        if (sort === "price") {
          return (
            (getSupplierStartingPrice(a) ?? Number.MAX_SAFE_INTEGER) -
            (getSupplierStartingPrice(b) ?? Number.MAX_SAFE_INTEGER)
          );
        }
        if (sort === "newest") {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }

        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        const ratingDelta = b.avgRating - a.avgRating;
        if (Math.abs(ratingDelta) > 0.001) return ratingDelta;
        return b.reviewCount - a.reviewCount;
      });
  }, [category, initialSuppliers, location, maxPrice, minRating, query, sort]);

  const activeFilterCount = [
    query,
    category !== "all" ? category : "",
    location,
    maxPrice,
    minRating !== "0" ? minRating : "",
  ].filter(Boolean).length;

  // Reset visible count whenever the filtered set changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filteredSuppliers]);

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setLocation("");
    setMaxPrice("");
    setMinRating("0");
    setSort("recommended");
  };

  const visibleSuppliers = filteredSuppliers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredSuppliers.length;
  const remaining = filteredSuppliers.length - visibleCount;
  const isFiltered = activeFilterCount > 0;
  const maxPriceValue = Number(maxPrice) || 0;
  const selectedCategoryName =
    categories.find((item) => item.slug === category)?.name ?? category;
  const selectedLocationName =
    locations.find((item) => normalize(item) === normalize(location)) ??
    location;
  const activeFilterChips = [
    query ? `Search: ${query}` : null,
    category !== "all" ? `Category: ${selectedCategoryName}` : null,
    location ? `Location: ${selectedLocationName}` : null,
    maxPriceValue > 0
      ? `Budget: up to ${formatSupplierPrice(maxPriceValue)}`
      : null,
    minRating !== "0" ? `Rating: ${minRating}+` : null,
  ].filter((chip): chip is string => Boolean(chip));

  const filterPanel = (presentation: "desktop" | "mobile") => (
    <div
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
            <h2 className="text-xl font-black tracking-[-0.03em] text-[#111827]">
              Filters
            </h2>
            <p className="mt-1 text-sm font-medium text-[#6B7280]">
              Refine your supplier search
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&>section:not(:last-child)]:mb-4">
        <section>
          <div className="mb-3.5 flex items-center gap-2">
            <Search className="h-4 w-4 text-[#2563EB]" strokeWidth={2.4} />
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6B7280]">
              Search
            </h3>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, service, style"
              className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-[#93C5FD] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </div>
        </section>

        <section>
          <div className="mb-3.5 flex items-center gap-2">
            <BriefcaseBusiness
              className="h-4 w-4 text-[#2563EB]"
              strokeWidth={2.4}
            />
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6B7280]">
              Category
            </h3>
          </div>
          <div className="relative">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-12 w-full appearance-none rounded-2xl border border-[#E5E7EB] bg-white pl-4 pr-11 text-sm font-bold text-slate-700 outline-none transition hover:border-[#93C5FD] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </section>

        <section>
          <div className="mb-3.5 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#2563EB]" strokeWidth={2.4} />
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6B7280]">
              Location
            </h3>
          </div>
          <div className="relative">
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="h-12 w-full appearance-none rounded-2xl border border-[#E5E7EB] bg-white pl-4 pr-11 text-sm font-bold text-slate-700 outline-none transition hover:border-[#93C5FD] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            >
              <option value="">Any location</option>
              {locations.map((item) => (
                <option key={item} value={item.toLowerCase()}>
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </section>

        <section>
          <div className="mb-3.5 flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-[#2563EB]" strokeWidth={2.4} />
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6B7280]">
              Budget
            </h3>
          </div>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="Maximum PHP budget"
            className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-[#93C5FD] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </section>

        <section>
          <div className="mb-3.5 flex items-center gap-2">
            <Star className="h-4 w-4 text-[#2563EB]" strokeWidth={2.4} />
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6B7280]">
              Rating
            </h3>
          </div>
          <div className="relative">
            <select
              value={minRating}
              onChange={(event) => setMinRating(event.target.value)}
              className="h-12 w-full appearance-none rounded-2xl border border-[#E5E7EB] bg-white pl-4 pr-11 text-sm font-bold text-slate-700 outline-none transition hover:border-[#93C5FD] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            >
              <option value="0">Any rating</option>
              <option value="4.5">4.5 and up</option>
              <option value="4">4.0 and up</option>
              <option value="3.5">3.5 and up</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 z-10 shrink-0 border-t border-[#E5E7EB] bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            if (presentation === "mobile") setMobileFiltersOpen(false);
          }}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#2563EB] text-sm font-black text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
        >
          View Results
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,#F9FAFB_0%,#F8FAFC_100%)]">
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Supplier filters"
        >
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
          />

          <div className="absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col px-3 pb-3">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-full min-h-0 flex-1 overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-lg shadow-slate-900/10">
              {filterPanel("mobile")}
            </div>
          </div>
        </div>
      )}

      <aside
        className={[
          "hidden h-full shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-out lg:block",
          desktopFiltersOpen ? "w-[300px] opacity-100" : "w-0 opacity-0",
        ].join(" ")}
        aria-label="Supplier filters"
      >
        {filterPanel("desktop")}
      </aside>

      <main className="h-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-7 xl:px-10">
        <div className="flex flex-col gap-6">
          <section className="max-w-full overflow-hidden rounded-[24px] border border-[#E5E7EB]/90 bg-white shadow-sm shadow-slate-200/60">
            <div className="grid gap-4 p-5 sm:p-6 lg:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[#2563EB]">
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
                      Supplier marketplace
                    </span>
                  </div>

                  <h1 className="max-w-3xl break-words text-2xl font-black leading-8 tracking-[-0.04em] text-slate-950 sm:text-3xl sm:leading-tight">
                    Find trusted event suppliers
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#6B7280] sm:text-[15px]">
                    Showing{" "}
                    <span className="font-extrabold text-slate-950">
                      {Math.min(visibleCount, filteredSuppliers.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-extrabold text-slate-950">
                      {filteredSuppliers.length}
                    </span>{" "}
                    supplier{filteredSuppliers.length === 1 ? "" : "s"}
                    {isFiltered ? " matching your filters" : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDesktopFiltersOpen((open) => !open)}
                  aria-pressed={desktopFiltersOpen}
                  className="hidden h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#DBEAFE] bg-white px-4 text-sm font-extrabold text-[#1D4ED8] shadow-sm transition hover:bg-[#EFF6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 lg:inline-flex"
                >
                  {desktopFiltersOpen ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeftOpen className="h-4 w-4" />
                  )}
                  {desktopFiltersOpen ? "Hide filters" : "Show filters"}
                  {activeFilterCount > 0 ? (
                    <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-xs text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
              </div>

              <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="relative min-w-0">
                  <label htmlFor="supplier-search" className="sr-only">
                    Keyword supplier search
                  </label>
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="supplier-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search supplier name, service, category, or location..."
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F9FAFB] pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-[#93C5FD] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-[auto_minmax(180px,auto)]">
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(true)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 lg:hidden"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 ? (
                      <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-xs text-white">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </button>

                  <div className="relative min-w-0">
                    <ArrowUpDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <select
                      value={sort}
                      onChange={(event) =>
                        setSort(event.target.value as SortValue)
                      }
                      className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-10 text-sm font-bold text-slate-600 outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                      aria-label="Sort suppliers"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="rating">Highest rated</option>
                      <option value="price">Lowest starting price</option>
                      <option value="newest">Newest</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              {activeFilterChips.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  {activeFilterChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-bold text-[#1D4ED8]"
                    >
                      {chip}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500 transition hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                  >
                    Clear all
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          {filteredSuppliers.length === 0 ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#BFDBFE] bg-white px-6 py-14 text-center shadow-sm">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <Search className="h-7 w-7" />
              </div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
                No results
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
                No suppliers found
              </h2>
              <p className="mt-3 max-w-md text-sm font-medium leading-6 text-slate-500">
                Try changing the category, location, or search keyword. A
                broader budget or rating range may also help.
              </p>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563EB] px-6 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
                >
                  Clear all filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleSuppliers.map((supplier) => (
                <SupplierCard key={supplier.id} supplier={supplier} />
              ))}
            </div>
          )}

          {hasMore ? (
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#DBEAFE] bg-white px-6 text-sm font-extrabold text-[#1D4ED8] shadow-sm transition hover:bg-[#EFF6FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
              >
                Load more suppliers
              </button>
              <p className="text-xs font-semibold text-slate-400">
                {remaining} more supplier{remaining === 1 ? "" : "s"} available
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
