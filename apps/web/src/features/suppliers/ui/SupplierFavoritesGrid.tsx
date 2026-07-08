"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Heart,
  MapPin,
  Star,
  Store,
} from "lucide-react";
import { toggleSupplierFavoriteAction } from "../application/actions";
import type { SupplierMarketplaceProfile } from "../types/supplier.types";
import {
  getSupplierHeroImage,
  getSupplierStartingPrice,
} from "../utils/supplier-derive";
import {
  formatPriceUnit,
  formatRating,
  formatSupplierPrice,
} from "../utils/supplier-format";

type SupplierFavoritesGridProps = {
  initialSuppliers: SupplierMarketplaceProfile[];
};

export default function SupplierFavoritesGrid({
  initialSuppliers,
}: SupplierFavoritesGridProps) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleUnfavorite = async (
    event: React.MouseEvent<HTMLButtonElement>,
    supplierId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const previousSuppliers = suppliers;
    setSuppliers((current) =>
      current.filter((supplier) => supplier.id !== supplierId),
    );
    setPendingId(supplierId);

    const result = await toggleSupplierFavoriteAction({ supplierId });

    setPendingId(null);

    if (result.error || result.data?.isFavorited) {
      setSuppliers(previousSuppliers);
    }
  };

  if (suppliers.length === 0) {
    return (
      <div className="overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white px-6 py-16 text-center shadow-xl shadow-slate-200/60 sm:px-10 sm:py-20">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#EFF6FF] text-[#2563EB]">
          <Store className="h-7 w-7" />
        </div>

        <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
          No saved suppliers yet
        </p>

        <h2 className="mx-auto mt-2 max-w-xl text-3xl font-black tracking-[-0.05em] text-[#111827]">
          Build a supplier shortlist for your next event.
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#6B7280]">
          Save accredited photographers, caterers, and other event suppliers
          while browsing, then return here to compare them later.
        </p>

        <Link
          href="/suppliers"
          className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
        >
          Browse Suppliers
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {suppliers.map((supplier) => {
        const isPending = pendingId === supplier.id;
        const image = getSupplierHeroImage(supplier);
        const startingPrice = getSupplierStartingPrice(supplier);
        const priceUnit =
          supplier.packages.find((pkg) => pkg.price === startingPrice)
            ?.priceUnit ?? supplier.priceUnit;
        const topAreas = supplier.serviceAreas.slice(0, 2);

        return (
          <article
            key={supplier.id}
            className="group relative flex h-full overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-slate-200/80"
          >
            <Link
              href={`/suppliers/${supplier.slug}`}
              className="flex h-full w-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
            >
              <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={supplier.businessName}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/5 to-transparent" />

                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-emerald-700 shadow-sm backdrop-blur-md">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Accredited
                </span>

                {supplier.category ? (
                  <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1D4ED8] shadow-sm backdrop-blur-md">
                    {supplier.category.name}
                  </span>
                ) : null}
              </div>

              <div className="flex min-h-[190px] flex-1 flex-col justify-between gap-5 p-5">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-1 text-sm font-extrabold text-[#111827]">
                    <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                    {formatRating(supplier.avgRating, supplier.reviewCount)}
                  </div>

                  <h2 className="line-clamp-1 text-lg font-extrabold leading-6 tracking-[-0.02em] text-slate-950 transition group-hover:text-[#1D4ED8]">
                    {supplier.businessName}
                  </h2>

                  {supplier.headline ? (
                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-slate-500">
                      {supplier.headline}
                    </p>
                  ) : null}

                  <p className="mt-2 flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-slate-500">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="line-clamp-1">
                      {topAreas.length > 0
                        ? topAreas.join(", ")
                        : "Service area on request"}
                    </span>
                  </p>
                </div>

                <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                  <div className="min-w-0">
                    <p className="text-lg font-black leading-6 text-slate-950">
                      {formatSupplierPrice(startingPrice)}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                      {formatPriceUnit(priceUnit) || "starting price"}
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={(event) => handleUnfavorite(event, supplier.id)}
              disabled={isPending}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm backdrop-blur-md transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 disabled:cursor-wait disabled:opacity-70"
              aria-label={`Remove ${supplier.businessName} from favorites`}
            >
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            </button>
          </article>
        );
      })}
    </div>
  );
}
