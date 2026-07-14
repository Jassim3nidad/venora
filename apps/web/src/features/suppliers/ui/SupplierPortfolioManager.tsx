"use client";

import Link from "next/link";
import { Plus, Edit2, Star, Calendar, MapPin, EyeOff, LayoutGrid } from "lucide-react";
import type {
  SupplierMarketplaceProfile,
  SupplierPortfolioItem,
} from "../types/supplier.types";
import { format } from "date-fns";

export function SupplierPortfolioManager({
  profile,
}: {
  profile: SupplierMarketplaceProfile;
}) {
  const sortedPortfolio = [...profile.portfolio].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return a.sortOrder - b.sortOrder || (a.title || "").localeCompare(b.title || "");
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Portfolio Projects</h2>
          <p className="text-sm text-slate-500">Manage the projects displayed on your public profile.</p>
        </div>
        <Link
          href="/dashboard/supplier/portfolio/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        >
          <Plus className="h-4 w-4" />
          Add New Project
        </Link>
      </div>

      {sortedPortfolio.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <div className="mb-4 rounded-full bg-white p-4 shadow-sm">
            <LayoutGrid className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-1 text-lg font-bold text-slate-900">No projects yet</h3>
          <p className="mb-6 max-w-sm text-sm text-slate-500">
            Showcase your best work to help customers understand your style and expertise.
          </p>
          <Link
            href="/dashboard/supplier/portfolio/new"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#2563EB] shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Create Your First Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPortfolio.map((item) => (
            <div
              key={item.id}
              className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${
                item.status === "hidden" ? "border-slate-200 opacity-60 grayscale-[0.5]" : "border-slate-200"
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {item.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.imageUrl}
                    alt={item.title || "Portfolio project"}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <LayoutGrid className="h-8 w-8" />
                  </div>
                )}
                
                {/* Status Badges */}
                <div className="absolute left-3 top-3 flex flex-col gap-2">
                  {item.isFeatured && (
                    <div className="flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-950 shadow-sm backdrop-blur-md">
                      <Star className="h-3 w-3" />
                      Featured
                    </div>
                  )}
                  {item.status === "draft" && (
                    <div className="flex w-fit items-center gap-1 rounded-full bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
                      Draft
                    </div>
                  )}
                  {item.status === "hidden" && (
                    <div className="flex w-fit items-center gap-1 rounded-full bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
                      <EyeOff className="h-3 w-3" />
                      Hidden
                    </div>
                  )}
                </div>

                {item.imageUrls.length > 1 && (
                  <div className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                    {item.imageUrls.length} Photos
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="line-clamp-1 font-bold text-slate-900">
                    {item.title || "Untitled Project"}
                  </h3>
                  <Link
                    href={`/dashboard/supplier/portfolio/${item.id}/edit`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition hover:bg-[#2563EB] hover:text-white"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Link>
                </div>
                
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 text-xs font-semibold text-slate-500">
                  {item.eventType && (
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                      {item.eventType}
                    </div>
                  )}
                  {item.eventDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 opacity-70" />
                      {format(new Date(item.eventDate), "MMM yyyy")}
                    </div>
                  )}
                  {(item.city || item.province) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 opacity-70" />
                      {[item.city, item.province].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
