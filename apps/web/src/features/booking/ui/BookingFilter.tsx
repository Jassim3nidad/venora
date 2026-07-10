"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function BookingFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get("filter") ?? "latest";

  return (
    <select
      value={currentFilter}
      onChange={(e) => {
        const value = e.target.value;
        const params = new URLSearchParams(searchParams.toString());
        if (value === "latest") {
          params.delete("filter");
        } else {
          params.set("filter", value);
        }
        router.push(`?${params.toString()}`);
      }}
      className="h-10 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a] shadow-sm shadow-slate-200/60 outline-none hover:border-[#93c5fd] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
    >
      <option value="latest">Latest requested</option>
      <option value="oldest">Oldest requested</option>
      <option value="approved">Approved</option>
      <option value="declined">Declined</option>
    </select>
  );
}
