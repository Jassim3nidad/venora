"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RotateCcw } from "lucide-react";
import MarketingNavbar from "@/components/layout/MarketingNavbar";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // We log the error to the console or an error tracking service here,
    // but we do not display it to the user.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#F9FAFB] text-[#111827] antialiased">
      <MarketingNavbar />
      <main className="flex w-full flex-grow flex-col items-center justify-center p-6 text-center">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] bg-red-50 text-red-600 shadow-inner shadow-red-500/10">
          <AlertOctagon className="h-10 w-10" />
        </div>
        <h1 className="mb-4 text-4xl font-black tracking-[-0.04em] text-[#111827] sm:text-5xl">
          Something went wrong
        </h1>
        <p className="mb-8 max-w-md text-lg font-medium leading-7 text-[#4B5563]">
          We encountered an unexpected error while processing your request. Please try again.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => reset()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-7 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#DBEAFE] bg-white px-7 text-sm font-extrabold text-[#1D4ED8] shadow-sm transition hover:bg-[#EFF6FF]"
          >
            Return to Homepage
          </Link>
        </div>
      </main>
    </div>
  );
}
