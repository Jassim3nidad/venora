"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEventHandler,
  type ElementType,
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
  WalletCards,
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

type AccordionId = "search" | "location" | "category" | "budgetRating";

type SuppliersMarketplaceClientProps = {
  initialSuppliers: SupplierMarketplaceProfile[];
  categories: SupplierCategory[];
};

const RATING_OPTIONS = [
  { label: "4.5 and up", value: "4.5" },
  { label: "4.0 and up", value: "4" },
  { label: "3.5 and up", value: "3.5" },
];

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
  icon: ElementType;
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
        aria-controls={`supplier-filter-panel-${id}`}
        id={`supplier-filter-trigger-${id}`}
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
          id={`supplier-filter-panel-${id}`}
          role="region"
          aria-labelledby={`supplier-filter-trigger-${id}`}
          className="border-t border-[#E5E7EB] px-3.5 pb-3.5 pt-3"
        >
          {children}
        </div>
      ) : null}
    </section>
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

            <h2 className="text-lg font-bold leading-6 tracking-[-0.03em] text-[#111827] transition group-hover:text-[#1D4ED8]">
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
              <p className="text-lg font-bold text-slate-950">
                {formatSupplierPrice(startingPrice)}
              </p>
              {startingPrice ? (
                <p className="text-xs font-semibold text-slate-500">
                  {formatPriceUnit(priceUnit)}
                </p>
              ) : null}
            </div>
            <span className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#2563EB] px-4 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-sm shadow-[#2563EB]/20 transition group-hover:bg-[#1D4ED8]">
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
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [sort, setSort] = useState<SortValue>("recommended");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<AccordionId | null>(
    "search",
  );

  const locations = useMemo(
    () =>
      [
        ...new Set(
          initialSuppliers.flatMap((supplier) => supplier.serviceAreas),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [initialSuppliers],
  );

  const categoryNames = useMemo(
    () => categories.map((item) => item.name),
    [categories],
  );

  const selectedCategoryName =
    categories.find((item) => item.slug === category)?.name ?? "";

  const filteredSuppliers = useMemo(() => {
    const q = normalize(query);
    const selectedCategory = normalize(category);
    const selectedLocation = normalize(location);
    const priceFloor = Number(minPrice) || 0;
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
        if (priceFloor > 0 || priceLimit > 0) {
          const startingPrice = getSupplierStartingPrice(supplier);
          if (!startingPrice) return false;
          if (priceFloor > 0 && startingPrice < priceFloor) return false;
          if (priceLimit > 0 && startingPrice > priceLimit) return false;
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
  }, [
    category,
    initialSuppliers,
    location,
    maxPrice,
    minPrice,
    minRating,
    query,
    sort,
  ]);

  const activeFilterCount = [
    query,
    category !== "all" ? category : "",
    location,
    minPrice,
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
    setMinPrice("");
    setMaxPrice("");
    setMinRating("0");
    setSort("recommended");
  };

  const visibleSuppliers = filteredSuppliers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredSuppliers.length;
  const remaining = filteredSuppliers.length - visibleCount;
  const isFiltered = activeFilterCount > 0;
  const minPriceValue = Number(minPrice) || 0;
  const maxPriceValue = Number(maxPrice) || 0;
  const selectedLocationName =
    locations.find((item) => normalize(item) === normalize(location)) ??
    location;
  const selectedRatingLabel =
    RATING_OPTIONS.find((item) => item.value === minRating)?.label ?? null;
  const budgetSummary =
    minPriceValue || maxPriceValue
      ? `${minPriceValue ? formatSupplierPrice(minPriceValue) : "Any"} - ${
          maxPriceValue ? formatSupplierPrice(maxPriceValue) : "No limit"
        }`
      : "Any budget";
  const budgetRatingSummary = [
    minPriceValue || maxPriceValue ? budgetSummary : null,
    selectedRatingLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  const activeFilterChips = [
    query ? `Search: ${query}` : null,
    category !== "all" ? `Category: ${selectedCategoryName}` : null,
    location ? `Location: ${selectedLocationName}` : null,
    minPriceValue || maxPriceValue ? `Budget: ${budgetSummary}` : null,
    minRating !== "0" ? `Rating: ${minRating}+` : null,
  ].filter((chip): chip is string => Boolean(chip));

  const toggleAccordion = (id: AccordionId) => {
    setOpenAccordion((current) => (current === id ? null : id));
  };

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

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-gutter:stable]">
        <FilterAccordion
          id="search"
          title="Search"
          icon={Search}
          open={openAccordion === "search"}
          activeCount={query ? 1 : 0}
          summary={query || undefined}
          onToggle={toggleAccordion}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, service, style"
              className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-11 pr-4 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-slate-400 hover:border-[#BFDBFE] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </div>
        </FilterAccordion>

        <FilterAccordion
          id="location"
          title="Location"
          icon={MapPin}
          open={openAccordion === "location"}
          activeCount={location ? 1 : 0}
          summary={selectedLocationName || undefined}
          onToggle={toggleAccordion}
        >
          <div className="relative">
            <label className="sr-only" htmlFor="supplier-location-filter">
              Location
            </label>
            <select
              id="supplier-location-filter"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="h-11 w-full appearance-none rounded-2xl border border-[#E5E7EB] bg-white px-4 pr-10 text-left text-sm font-medium text-[#111827] outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            >
              <option value="">Any location</option>
              {locations.map((item) => (
                <option key={item} value={item.toLowerCase()}>
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          </div>
        </FilterAccordion>

        <FilterAccordion
          id="category"
          title="Category"
          icon={BriefcaseBusiness}
          open={openAccordion === "category"}
          activeCount={category !== "all" ? 1 : 0}
          summary={selectedCategoryName || undefined}
          onToggle={toggleAccordion}
        >
          <CheckboxColumn
            options={categoryNames}
            selected={selectedCategoryName ? [selectedCategoryName] : []}
            namePrefix="supplier-category"
            onToggle={(name) => {
              const match = categories.find((item) => item.name === name);
              if (!match) return;
              setCategory(category === match.slug ? "all" : match.slug);
            }}
          />
        </FilterAccordion>

        <FilterAccordion
          id="budgetRating"
          title="Budget & Rating"
          icon={WalletCards}
          open={openAccordion === "budgetRating"}
          activeCount={
            [minPrice, maxPrice, minRating !== "0" ? minRating : ""].filter(
              Boolean,
            ).length
          }
          summary={budgetRatingSummary || undefined}
          onToggle={toggleAccordion}
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Budget
              </p>
              <p className="mb-2.5 rounded-2xl bg-[#F8FAFC] px-3 py-2 text-center text-sm font-extrabold text-[#111827]">
                {budgetSummary}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"
                    htmlFor="supplier-min-budget-input"
                  >
                    Min
                  </label>
                  <input
                    id="supplier-min-budget-input"
                    type="number"
                    min={0}
                    step={5000}
                    inputMode="numeric"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                    className="h-10 w-full rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                    placeholder="₱ min"
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"
                    htmlFor="supplier-max-budget-input"
                  >
                    Max
                  </label>
                  <input
                    id="supplier-max-budget-input"
                    type="number"
                    min={0}
                    step={5000}
                    inputMode="numeric"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    className="h-10 w-full rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                    placeholder="₱ max"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Rating
              </p>
              <CheckboxColumn
                options={RATING_OPTIONS.map((item) => item.label)}
                selected={selectedRatingLabel ? [selectedRatingLabel] : []}
                namePrefix="supplier-rating"
                onToggle={(label) => {
                  const match = RATING_OPTIONS.find(
                    (item) => item.label === label,
                  );
                  if (!match) return;
                  setMinRating(minRating === match.value ? "0" : match.value);
                }}
              />
            </div>
          </div>
        </FilterAccordion>
      </div>

      <div className="sticky bottom-0 z-10 shrink-0 border-t border-[#E5E7EB] bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            if (presentation === "mobile") setMobileFiltersOpen(false);
          }}
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
    </div>
  );

  return (
    <div className="flex min-w-0 flex-1 items-start bg-[linear-gradient(180deg,#F9FAFB_0%,#F8FAFC_100%)]">
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
            <div className="min-h-0 flex-1 overflow-hidden">
              {filterPanel("mobile")}
            </div>
          </div>
        </div>
      )}

      <aside
        className={[
          "sticky top-0 hidden h-[100dvh] shrink-0 self-start overflow-hidden transition-all duration-300 lg:block",
          desktopFiltersOpen ? "w-[300px] opacity-100" : "w-0 opacity-0",
        ].join(" ")}
        aria-hidden={!desktopFiltersOpen}
        inert={!desktopFiltersOpen ? true : undefined}
      >
        {filterPanel("desktop")}
      </aside>

      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1120px]">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
                  Marketplace
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#111827] sm:text-4xl">
                  Find trusted suppliers
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#6B7280] sm:text-base">
                  Browse accredited partners for catering, photography, styling,
                  entertainment, and more
                  {isFiltered ? " matching your filters" : ""}.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDesktopFiltersOpen((open) => !open)}
                  aria-pressed={desktopFiltersOpen}
                  className="hidden h-11 items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] transition hover:border-[#BFDBFE] hover:bg-[#F8FAFC] lg:inline-flex"
                >
                  {desktopFiltersOpen ? (
                    <PanelLeftClose className="h-4 w-4 text-[#2563EB]" />
                  ) : (
                    <PanelLeftOpen className="h-4 w-4 text-[#2563EB]" />
                  )}
                  {desktopFiltersOpen ? "Hide filters" : "Show filters"}
                  {activeFilterCount > 0 ? (
                    <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-extrabold text-[#1D4ED8]">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>

                <div className="flex h-11 items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-3">
                  <ArrowUpDown className="h-4 w-4 text-[#2563EB]" />
                  <FilterSelect
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as SortValue)
                    }
                    bold
                  >
                    <option value="recommended">Recommended</option>
                    <option value="rating">Highest rated</option>
                    <option value="price">Lowest starting price</option>
                    <option value="newest">Newest</option>
                  </FilterSelect>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] transition hover:border-[#BFDBFE] hover:bg-[#F8FAFC] lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" />
                  Filters
                  {activeFilterCount > 0 ? (
                    <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-extrabold text-[#1D4ED8]">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>

            {activeFilterChips.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
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
                  className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1D4ED8] hover:text-[#2563EB]"
                >
                  Clear all
                </button>
              </div>
            ) : null}
          </div>

          {visibleSuppliers.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#BFDBFE] bg-white px-6 py-16 text-center">
              <h2 className="text-xl font-black tracking-[-0.03em] text-[#111827]">
                No suppliers match
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[#6B7280]">
                Try a different category, location, or search term. A broader
                budget or rating range may also help.
              </p>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-[#2563EB] px-5 text-sm font-bold text-white transition hover:bg-[#1D4ED8]"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm font-semibold text-[#6B7280]">
                Showing{" "}
                <span className="font-extrabold text-[#111827]">
                  {visibleSuppliers.length}
                </span>{" "}
                of{" "}
                <span className="font-extrabold text-[#111827]">
                  {filteredSuppliers.length}
                </span>{" "}
                suppliers
              </div>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visibleSuppliers.map((supplier) => (
                  <SupplierCard key={supplier.id} supplier={supplier} />
                ))}
              </div>

              {hasMore ? (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((count) => count + PAGE_SIZE)
                    }
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#DBEAFE] bg-white px-6 text-sm font-bold text-[#1D4ED8] transition hover:border-[#2563EB] hover:bg-[#EFF6FF]"
                  >
                    Show more ({remaining} remaining)
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
