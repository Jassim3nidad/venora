"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Panel } from "@/src/components/dashboard/enterprise/ui";

export function ReportsFilterClient({
  venues,
}: {
  venues: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentVenue = searchParams.get("venue") ?? "all";
  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams],
  );

  const handleVenueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    startTransition(() => {
      router.push(`?${createQueryString("venue", e.target.value)}`);
    });
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => {
      router.push(`?${createQueryString("from", e.target.value)}`);
    });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => {
      router.push(`?${createQueryString("to", e.target.value)}`);
    });
  };

  return (
    <Panel className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end p-4 sm:p-5 bg-gradient-to-br from-[#f8fbff] to-white">
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748b]">
          Filter by Venue
        </label>
        <select
          value={currentVenue}
          onChange={handleVenueChange}
          disabled={isPending}
          className="block w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-medium text-[#0f172a] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] disabled:opacity-50"
        >
          <option value="all">All Assigned Venues</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 gap-4">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748b]">
            From Date
          </label>
          <input
            type="date"
            value={currentFrom}
            onChange={handleFromChange}
            disabled={isPending}
            className="block w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-medium text-[#0f172a] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] disabled:opacity-50"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#64748b]">
            To Date
          </label>
          <input
            type="date"
            value={currentTo}
            onChange={handleToChange}
            disabled={isPending}
            className="block w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-medium text-[#0f172a] focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb] disabled:opacity-50"
          />
        </div>
      </div>
    </Panel>
  );
}
