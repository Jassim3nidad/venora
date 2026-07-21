"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function CatalogSort() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "newest";

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    router.push(`/shop?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="sort" className="text-xs font-bold uppercase tracking-widest text-text-secondary">
        Sort By
      </label>
      <select
        id="sort"
        value={currentSort}
        onChange={handleSortChange}
        className="rounded-none border-b border-border bg-transparent py-1 pr-8 text-sm font-bold uppercase tracking-widest text-text-primary focus:border-brand-500 focus:outline-none focus:ring-0"
      >
        <option value="newest">Newest Arrivals</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
      </select>
    </div>
  );
}
