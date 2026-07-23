"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useVenueComparison } from "@/features/venues/hooks/useVenueComparison";
import {
  Scale,
  Trash2,
  MapPin,
  Users,
  DollarSign,
  Star,
  CheckCircle2,
  Plus,
  ArrowLeft,
  X,
  Building,
  Loader2,
} from "lucide-react";

interface PublicVenueComparison {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  province: string | null;
  capacity_max: number | null;
  venue_type: string | null;
  base_price: number | null;
  price_unit: string | null;
  rating: number | null;
  review_count: number | null;
  cover_image: string | null;
  is_accredited: boolean;
  status: string;
}

export default function CompareVenuesPage() {
  const { venueIds, removeVenueId, clearComparison } = useVenueComparison();
  const [venues, setVenues] = useState<PublicVenueComparison[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (venueIds.length === 0) {
      setVenues([]);
      return;
    }

    const fetchVenues = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("venues")
        .select(`
          id,
          name,
          slug,
          city,
          province,
          capacity_max,
          venue_type,
          base_price,
          price_unit,
          rating,
          review_count,
          cover_image,
          is_accredited,
          status
        `)
        .in("id", venueIds)
        .eq("status", "published");

      setVenues((data as PublicVenueComparison[]) || []);
      setIsLoading(false);
    };

    fetchVenues();
  }, [venueIds]);

  if (venueIds.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
          <Scale className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          No venues selected for comparison
        </h1>
        <p className="text-slate-600 max-w-md mb-6 text-sm">
          Browse our curated venue marketplace and click &quot;Compare&quot; on up to 4 venues to evaluate features, capacity, pricing, and policies side-by-side.
        </p>
        <Link
          href="/venues"
          className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-medium text-sm hover:bg-rose-500 transition shadow-lg shadow-rose-600/20"
        >
          Browse Venues
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href="/venues"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 mb-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Venues
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Side-by-Side Venue Comparison
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Evaluating {venues.length} of 4 venue slots
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearComparison}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition"
          >
            <Trash2 className="w-4 h-4 text-slate-400" />
            Clear Comparison
          </button>
          {venueIds.length < 4 && (
            <Link
              href="/venues"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-medium transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add More
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600 mb-2" />
          <p className="text-sm font-medium">Loading live venue data...</p>
        </div>
      ) : (
        /* Comparison Grid Table */
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="p-4 w-48 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Feature
                </th>
                {venues.map((v: PublicVenueComparison) => (
                  <th key={v.id} className="p-4 w-64 min-w-[240px]">
                    <div className="relative group">
                      <button
                        onClick={() => removeVenueId(v.id)}
                        className="absolute -top-1 -right-1 p-1 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full border border-slate-200 shadow-sm transition"
                        title="Remove venue"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="relative h-36 w-full rounded-xl overflow-hidden mb-3 bg-slate-100">
                        {v.cover_image ? (
                          <Image
                            src={v.cover_image}
                            alt={v.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Building className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                        {v.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {[v.city, v.province].filter(Boolean).join(", ") || "Location unavailable"}
                      </p>
                    </div>
                  </th>
                ))}
                {Array.from({ length: 4 - venues.length }).map((_, idx) => (
                  <th key={idx} className="p-4 w-64 min-w-[240px] bg-slate-50/30 border-l border-slate-100">
                    <Link
                      href="/venues"
                      className="h-48 rounded-xl border-2 border-dashed border-slate-200 hover:border-rose-400 bg-slate-50/50 hover:bg-rose-50/20 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-rose-600 transition group"
                    >
                      <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold">Select Venue</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {/* Price */}
              <tr>
                <td className="p-4 font-semibold text-slate-700 bg-slate-50/50">Base Price</td>
                {venues.map((v: PublicVenueComparison) => (
                  <td key={v.id} className="p-4 font-bold text-slate-900">
                    {v.base_price != null ? (
                      <div className="flex items-center gap-1 text-rose-600">
                        <DollarSign className="w-4 h-4 text-rose-500" />
                        ₱{v.base_price.toLocaleString()}{" "}
                        <span className="text-xs text-slate-500 font-normal">
                          / {v.price_unit || "event"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Price on inquiry</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Capacity */}
              <tr>
                <td className="p-4 font-semibold text-slate-700 bg-slate-50/50">Capacity</td>
                {venues.map((v: PublicVenueComparison) => (
                  <td key={v.id} className="p-4 text-slate-800">
                    {v.capacity_max != null ? (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        Up to {v.capacity_max.toLocaleString()} guests
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Not specified</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Venue Type */}
              <tr>
                <td className="p-4 font-semibold text-slate-700 bg-slate-50/50">Venue Type</td>
                {venues.map((v: PublicVenueComparison) => (
                  <td key={v.id} className="p-4 text-slate-800">
                    <span className="capitalize px-2.5 py-1 rounded-md bg-slate-100 font-medium text-xs text-slate-700">
                      {v.venue_type || "General"}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Rating */}
              <tr>
                <td className="p-4 font-semibold text-slate-700 bg-slate-50/50">Rating</td>
                {venues.map((v: PublicVenueComparison) => (
                  <td key={v.id} className="p-4 text-slate-800">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-slate-900">
                        {v.rating != null ? v.rating.toFixed(1) : "New"}
                      </span>
                      {v.review_count != null && (
                        <span className="text-xs text-slate-500">
                          ({v.review_count} reviews)
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Accreditation */}
              <tr>
                <td className="p-4 font-semibold text-slate-700 bg-slate-50/50">Accreditation</td>
                {venues.map((v: PublicVenueComparison) => (
                  <td key={v.id} className="p-4 text-slate-800">
                    {v.is_accredited ? (
                      <div className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs bg-emerald-50 px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified Partner
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-slate-500 text-xs bg-slate-100 px-2.5 py-1 rounded-md">
                        Standard Listing
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Actions */}
              <tr className="bg-slate-50/80">
                <td className="p-4 font-semibold text-slate-700">Actions</td>
                {venues.map((v: PublicVenueComparison) => (
                  <td key={v.id} className="p-4">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/venues/${v.slug}`}
                        className="w-full text-center px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/venues/${v.slug}#booking`}
                        className="w-full text-center px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                      >
                        Check Availability
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
