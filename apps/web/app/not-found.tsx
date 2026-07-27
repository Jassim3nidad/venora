import Link from "next/link";
import { ArrowRight, MapPinOff } from "lucide-react";
import MarketingNavbar from "@/components/layout/MarketingNavbar";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#F9FAFB] text-[#111827] antialiased">
      <MarketingNavbar />
      <main className="flex w-full flex-grow flex-col items-center justify-center p-6 text-center">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] bg-[#EFF6FF] text-[#2563EB] shadow-inner shadow-blue-500/10">
          <MapPinOff className="h-10 w-10" />
        </div>
        <h1 className="mb-4 text-4xl font-black tracking-[-0.04em] text-[#111827] sm:text-5xl">
          Page not found
        </h1>
        <p className="mb-8 max-w-md text-lg font-medium leading-7 text-[#4B5563]">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563EB] px-7 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8]"
          >
            Return to Homepage
          </Link>
          <Link
            href="/help"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#DBEAFE] bg-white px-7 text-sm font-extrabold text-[#1D4ED8] shadow-sm transition hover:bg-[#EFF6FF]"
          >
            Visit Help Center
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
