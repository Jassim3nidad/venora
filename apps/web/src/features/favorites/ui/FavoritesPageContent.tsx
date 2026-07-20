"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, Search, Store } from "lucide-react";
import type { MarketplaceVenue } from "@/src/features/venues/data/research-venues";
import FavoritesGrid from "@/src/features/venues/ui/FavoritesGrid";
import type { SupplierMarketplaceProfile } from "@/features/suppliers/types/supplier.types";
import SupplierFavoritesGrid from "@/features/suppliers/ui/SupplierFavoritesGrid";

type FavoritesTab = "venues" | "suppliers";

type FavoritesPageContentProps = {
  favoriteVenues: MarketplaceVenue[];
  favoriteSuppliers: SupplierMarketplaceProfile[];
};

export default function FavoritesPageContent({
  favoriteVenues,
  favoriteSuppliers,
}: FavoritesPageContentProps) {
  const [activeTab, setActiveTab] = useState<FavoritesTab>("venues");
  const venueCount = favoriteVenues.length;
  const supplierCount = favoriteSuppliers.length;
  const totalCount = venueCount + supplierCount;

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
                <Heart className="h-3.5 w-3.5 fill-[#2563EB]" />
                Saved shortlist
              </div>

              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-[-0.05em] text-[#111827] sm:text-5xl">
                Your saved venues and suppliers, ready when you are.
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-[#6B7280] sm:text-base">
                Keep venue spaces and event suppliers in one place so you can
                compare options and move forward with planning.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-xl shadow-slate-200/60">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6B7280]">
                    Saved venues
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-[-0.04em] text-[#111827]">
                    {venueCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6B7280]">
                    Saved suppliers
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-[-0.04em] text-[#111827]">
                    {supplierCount}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium leading-6 text-[#6B7280]">
                {totalCount > 0
                  ? `${totalCount} saved item${totalCount === 1 ? "" : "s"} across venues and suppliers.`
                  : "Start saving venues and suppliers from the marketplace."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
              Collection
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[#111827]">
              {activeTab === "venues" ? "Saved venues" : "Saved suppliers"}
            </h2>
          </div>

          <div className="inline-flex w-fit items-center rounded-full border border-[#E5E7EB] bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveTab("venues")}
              className={[
                "rounded-full px-4 py-2 text-sm font-extrabold transition",
                activeTab === "venues"
                  ? "bg-[#EFF6FF] text-[#2563EB]"
                  : "text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#2563EB]",
              ].join(" ")}
            >
              Saved venues ({venueCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("suppliers")}
              className={[
                "rounded-full px-4 py-2 text-sm font-extrabold transition",
                activeTab === "suppliers"
                  ? "bg-[#EFF6FF] text-[#2563EB]"
                  : "text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#2563EB]",
              ].join(" ")}
            >
              Saved suppliers ({supplierCount})
            </button>
          </div>
        </div>

        {activeTab === "venues" ? (
          <>
            <div className="mb-6 flex justify-end">
              <Link
                href="/venues"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 text-sm font-extrabold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
              >
                <Search className="h-4 w-4" />
                Browse venues
              </Link>
            </div>
            <FavoritesGrid initialVenues={favoriteVenues} />
          </>
        ) : (
          <>
            <div className="mb-6 flex justify-end">
              <Link
                href="/suppliers"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 text-sm font-extrabold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
              >
                <Store className="h-4 w-4" />
                Browse suppliers
              </Link>
            </div>
            <SupplierFavoritesGrid initialSuppliers={favoriteSuppliers} />
          </>
        )}

        {totalCount === 0 ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/venues"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white transition hover:bg-[#1D4ED8]"
            >
              Browse Venues
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/suppliers"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#1D4ED8] transition hover:bg-[#EFF6FF]"
            >
              Browse Suppliers
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </section>
    </>
  );
}
