"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@venora/ui";
import { useState, useEffect, useCallback } from "react";

export function PackageFilters({ venues }: { venues: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentVenue = searchParams.get("venueId") ?? "all";
  const currentSearch = searchParams.get("q") ?? "";

  const [searchValue, setSearchValue] = useState(currentSearch);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "all" || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== currentSearch) {
        updateFilters({ q: searchValue || null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, currentSearch, updateFilters]);

  useEffect(() => {
    // Fetch counts per venue to show badges in the dropdown
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/packages`);
        const json = await res.json();
        if (!mounted || !json?.success) return;
        setCounts(json.data.counts || {});
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      <div className="relative w-full sm:w-[240px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
        <input
          type="text"
          placeholder="Search packages..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:ring-offset-1"
        />
      </div>
      
      <Select
        value={currentVenue}
        onValueChange={(val) => updateFilters({ venueId: val })}
      >
        <SelectTrigger className="w-full sm:w-[240px]">
          <SelectValue placeholder="All Venues" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Venues</SelectItem>
          {venues.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              <div className="flex items-center justify-between">
                <span>{v.name}</span>
                <span className="ml-3 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {counts[v.id] ?? 0}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
