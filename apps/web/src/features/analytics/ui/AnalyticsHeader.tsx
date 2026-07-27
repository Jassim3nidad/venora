"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@venora/ui";
import { AnalyticsExportActions } from "./AnalyticsExportActions";

type AnalyticsHeaderProps = {
  venues: { id: string; name: string }[];
  defaultVenue?: string;
  defaultPeriod?: string;
  defaultCompare?: string;
  range: { from: string; to: string };
};

export function AnalyticsHeader({
  venues,
  defaultVenue = "all",
  defaultPeriod = "last_12_months",
  defaultCompare = "previous_period",
  range,
}: AnalyticsHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentVenue = searchParams.get("venue") || defaultVenue;
  const currentPeriod = searchParams.get("period") || defaultPeriod;
  const currentCompare = searchParams.get("compare") || defaultCompare;

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams],
  );

  const handleVenueChange = (val: string) => {
    router.push(pathname + "?" + createQueryString("venue", val));
  };
  const handlePeriodChange = (val: string) => {
    router.push(pathname + "?" + createQueryString("period", val));
  };
  const handleCompareChange = (val: string) => {
    router.push(pathname + "?" + createQueryString("compare", val));
  };

  return (
    <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1 max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight text-[#0f172a]">
          Analytics
        </h1>
        <p className="mt-2 text-sm text-[#475569] leading-relaxed">
          Understand booking performance, revenue, customer demand, and listing
          health across your venues.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={currentVenue} onValueChange={handleVenueChange}>
          <SelectTrigger className="w-[180px] bg-white h-10 shadow-sm border-slate-200">
            <SelectValue placeholder="All venues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All venues</SelectItem>
            {venues.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[180px] bg-white h-10 shadow-sm border-slate-200">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_30_days">Last 30 days</SelectItem>
            <SelectItem value="last_90_days">Last 90 days</SelectItem>
            <SelectItem value="last_6_months">Last 6 months</SelectItem>
            <SelectItem value="last_12_months">Last 12 months</SelectItem>
            <SelectItem value="this_year">This year</SelectItem>
            <SelectItem value="previous_year">Previous year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currentCompare} onValueChange={handleCompareChange}>
          <SelectTrigger className="w-[180px] bg-white h-10 shadow-sm border-slate-200">
            <SelectValue placeholder="Compare" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="previous_period">Previous period</SelectItem>
            <SelectItem value="previous_year">Previous year</SelectItem>
            <SelectItem value="none">No comparison</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

        <AnalyticsExportActions range={range} />
      </div>
    </div>
  );
}
