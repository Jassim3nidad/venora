"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Shop Error]", error);
  }, [error]);

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center bg-base py-24 text-center px-4">
      <div className="mb-6 rounded-full bg-red-900/10 p-6 text-red-500">
        <AlertCircle className="h-10 w-10" />
      </div>
      <h2 className="font-display text-2xl font-black uppercase tracking-widest text-text-primary mb-3">
        Catalog Error
      </h2>
      <p className="text-text-secondary mb-8 max-w-md">
        We encountered a problem loading the collection. Please try again.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="rounded-none bg-text-primary px-8 py-3 text-sm font-bold uppercase tracking-widest text-base transition hover:bg-brand-500"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-none border border-border bg-transparent px-8 py-3 text-sm font-bold uppercase tracking-widest text-text-primary transition hover:border-brand-500 hover:text-brand-500"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
