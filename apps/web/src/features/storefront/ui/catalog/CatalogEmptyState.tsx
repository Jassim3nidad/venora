import Link from "next/link";
import { SearchX } from "lucide-react";

export default function CatalogEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4 w-full h-full min-h-[400px]">
      <div className="rounded-full bg-border p-6 mb-6 text-text-muted">
        <SearchX className="h-10 w-10" />
      </div>
      <h3 className="font-display text-2xl font-black uppercase tracking-widest text-text-primary mb-3">
        No Results Found
      </h3>
      <p className="text-text-secondary mb-8 max-w-md">
        We couldn't find any products matching your current filters. Try adjusting your search or category selection.
      </p>
      <Link
        href="/shop"
        className="rounded-none border border-brand-500 bg-brand-500 px-8 py-3 text-sm font-bold uppercase tracking-widest text-base transition hover:bg-transparent hover:text-brand-500"
      >
        Clear All Filters
      </Link>
    </div>
  );
}
