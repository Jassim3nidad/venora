"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  BadgeCheck,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
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

type SortValue = "recommended" | "rating" | "price" | "newest";

type SuppliersMarketplaceClientProps = {
  initialSuppliers: SupplierMarketplaceProfile[];
  categories: SupplierCategory[];
};

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function SupplierCard({ supplier }: { supplier: SupplierMarketplaceProfile }) {
  const startingPrice = getSupplierStartingPrice(supplier);
  const priceUnit =
    supplier.packages.find((pkg) => pkg.price === startingPrice)?.priceUnit ??
    supplier.priceUnit;
  const image = getSupplierHeroImage(supplier);
  const topAreas = supplier.serviceAreas.slice(0, 3);

  return (
    <article className="group flex h-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#2563EB]/40 hover:shadow-lg">
      <Link href={`/suppliers/${supplier.slug}`} className="flex min-w-0 flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5" />
            Accredited
          </div>
          {supplier.isFeatured ? (
            <div className="absolute right-3 top-3 rounded-full bg-[#111827]/85 px-2.5 py-1 text-xs font-bold text-white">
              Featured
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {supplier.category ? (
                <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-bold text-[#1D4ED8]">
                  {supplier.category.name}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {formatRating(supplier.avgRating, supplier.reviewCount)}
              </span>
            </div>

            <h2 className="text-lg font-black leading-6 tracking-tight text-slate-950">
              {supplier.businessName}
            </h2>
            {supplier.headline ? (
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-600">
                {supplier.headline}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 text-sm text-slate-600">
            <div className="flex min-w-0 items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
              <span className="min-w-0 truncate font-semibold">
                {topAreas.length > 0 ? topAreas.join(", ") : "Service area on request"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[#2563EB]" />
              <span className="font-semibold">
                {formatResponseTime(supplier.responseTimeHours)}
              </span>
            </div>
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
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
            <span className="rounded-lg border border-[#DBEAFE] px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#1D4ED8] transition group-hover:bg-[#EFF6FF]">
              View
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
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setLocation("");
    setMaxPrice("");
    setMinRating("0");
    setSort("recommended");
  };

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#F8FAFC]">
      <div className="mx-auto grid w-full max-w-[1540px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
        <aside className="self-start rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" />
              <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">
                Filters
              </h2>
            </div>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-black uppercase tracking-[0.08em] text-[#1D4ED8] hover:text-[#2563EB]"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-500">Search</span>
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, service, style"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                />
              </span>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-500">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-500">Location</span>
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              >
                <option value="">Any location</option>
                {locations.map((item) => (
                  <option key={item} value={item.toLowerCase()}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-500">Max price</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="PHP budget"
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-500">Minimum rating</span>
              <select
                value={minRating}
                onChange={(event) => setMinRating(event.target.value)}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              >
                <option value="0">Any rating</option>
                <option value="4.5">4.5 and up</option>
                <option value="4">4.0 and up</option>
                <option value="3.5">3.5 and up</option>
              </select>
            </label>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#1D4ED8]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Supplier marketplace
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Event Suppliers
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
                  {filteredSuppliers.length} supplier{filteredSuppliers.length === 1 ? "" : "s"} found across catering, photo, styling, production, and coordination.
                </p>
              </div>

              <label className="grid min-w-[220px] gap-1.5">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Sort
                </span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortValue)}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                >
                  <option value="recommended">Recommended</option>
                  <option value="rating">Highest rated</option>
                  <option value="price">Lowest starting price</option>
                  <option value="newest">Newest</option>
                </select>
              </label>
            </div>
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                <Search className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black text-slate-950">
                No suppliers match those filters
              </h2>
              <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                Try a broader category, location, budget, or rating range.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#1D4ED8]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSuppliers.map((supplier) => (
                <SupplierCard key={supplier.id} supplier={supplier} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
