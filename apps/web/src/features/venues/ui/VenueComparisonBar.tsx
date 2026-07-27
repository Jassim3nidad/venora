"use client";

import Link from "next/link";
import { useVenueComparison } from "../hooks/useVenueComparison";
import { Scale, X, Trash2, ArrowRight } from "lucide-react";

export function VenueComparisonBar() {
  const { venueIds, removeVenueId, clearComparison } = useVenueComparison();

  if (venueIds.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-4xl bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-4 transition-all animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
          <Scale className="w-5 h-5" />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold">
            Comparing {venueIds.length} Venues
          </p>
          <p className="text-xs text-slate-400">Up to 4 venues side-by-side</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {venueIds.map((id) => (
            <div
              key={id}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-200 shrink-0"
            >
              <span className="truncate max-w-[100px]">Venue</span>
              <button
                onClick={() => removeVenueId(id)}
                className="hover:text-rose-400 p-0.5 rounded-full"
                aria-label={`Remove venue ${id} from comparison`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={clearComparison}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
          title="Clear all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <Link
          href="/compare"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs sm:text-sm rounded-xl transition shadow-lg shadow-rose-600/20"
        >
          Compare Now
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
