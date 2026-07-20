"use client";

import { useSearchParams } from "next/navigation";
import { Mail, Search, SlidersHorizontal, TicketCheck } from "lucide-react";
import { CustomerActivityTabs } from "@/src/components/customer/CustomerActivityTabs";
import {
  LoadingRegion,
  SkeletonBadge,
  SkeletonBlock,
  SkeletonButton,
} from "@/src/components/skeleton/SkeletonPrimitives";

function PageHeaderSkeleton({ view }: { view: "venues" | "suppliers" }) {
  const isSuppliers = view === "suppliers";

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
            {isSuppliers ? (
              <Mail className="h-3.5 w-3.5" />
            ) : (
              <TicketCheck className="h-3.5 w-3.5" />
            )}
            {isSuppliers ? "Supplier Inquiries" : "Booking center"}
          </span>
          <h1 className="max-w-3xl text-3xl font-black leading-9 tracking-[-0.04em] text-slate-950 sm:text-4xl sm:leading-tight">
            {isSuppliers ? "Supplier Inquiries" : "Track every booking request."}
          </h1>
          <SkeletonBlock className="mt-3 h-5 w-full max-w-2xl" />
        </div>
        <SkeletonButton className="h-12 w-full sm:w-40" />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/60"
        >
          <SkeletonBlock className="h-3 w-24 bg-slate-200" />
          <SkeletonBlock className="mt-3 h-8 w-10 bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

function VenueFilterSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/60 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" />
        <p className="text-sm font-extrabold text-slate-900">
          Filter by status
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {["w-32", "w-36", "w-32", "w-28", "w-32"].map((width, index) => (
          <SkeletonBadge key={`${width}-${index}`} className={`${width} h-10`} />
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_auto]">
        <SkeletonBlock className="h-12 w-full rounded-2xl bg-white" />
        <SkeletonBlock className="h-12 w-full rounded-2xl bg-white" />
        <SkeletonButton className="h-12 w-full lg:w-24" />
      </div>
      <SkeletonBlock className="mt-4 h-4 w-56" />
    </div>
  );
}

function SupplierFilterSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/60 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" />
        <p className="text-sm font-extrabold text-slate-900">
          Filter by status
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {["w-36", "w-28", "w-32", "w-32"].map((width, index) => (
          <SkeletonBadge key={`${width}-${index}`} className={`${width} h-10`} />
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px_auto]">
        <SkeletonBlock className="h-12 w-full rounded-2xl bg-white" />
        <SkeletonBlock className="h-12 w-full rounded-2xl bg-white" />
        <SkeletonBlock className="h-12 w-full rounded-2xl bg-white" />
        <SkeletonButton className="h-12 w-full lg:w-24" />
      </div>
      <SkeletonBlock className="mt-4 h-4 w-60" />
    </div>
  );
}

function VenueBookingCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70">
      <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SkeletonBlock className="h-56 rounded-none bg-[#EFF6FF] lg:h-full" />
        <div className="grid gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <SkeletonBadge className="w-36" />
              <SkeletonBlock className="mt-3 h-8 w-full max-w-xl bg-slate-200" />
              <div className="mt-3 flex flex-wrap gap-3">
                <SkeletonBlock className="h-5 w-40" />
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-5 w-24" />
              </div>
            </div>
            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 lg:min-w-[132px]">
              <SkeletonBlock className="h-3 w-16 bg-slate-200" />
              <SkeletonBlock className="mt-2 h-6 w-24 bg-slate-200" />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <SkeletonButton className="h-12 w-full sm:w-36" />
            <SkeletonButton className="h-12 w-full sm:w-40" />
            <SkeletonButton className="h-12 w-full sm:w-32" />
          </div>
          <SkeletonBlock className="h-3 w-48" />
        </div>
      </div>
    </article>
  );
}

function SupplierInquiryCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70 lg:h-[260px]">
      <div className="grid gap-0 lg:h-full lg:grid-cols-[260px_minmax(0,1fr)]">
        <SkeletonBlock className="h-56 rounded-none bg-[#EFF6FF] lg:h-full" />
        <div className="flex flex-col justify-between p-5 sm:p-6 lg:h-full">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <SkeletonBadge className="w-36" />
              <SkeletonBlock className="mt-3 h-8 w-56 bg-slate-200" />
              <SkeletonBlock className="mt-2 h-4 w-44" />
              <div className="mt-3 flex flex-wrap gap-3 lg:flex-nowrap">
                <SkeletonBlock className="h-5 w-full max-w-md" />
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-5 w-24" />
              </div>
            </div>
            <div className="shrink-0 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 lg:min-w-[132px]">
              <SkeletonBlock className="h-3 w-20 bg-slate-200" />
              <SkeletonBlock className="mt-2 h-6 w-24 bg-slate-200" />
            </div>
          </div>
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <SkeletonButton className="h-12 w-full sm:w-36" />
              <SkeletonButton className="h-12 w-full sm:w-40" />
            </div>
            <SkeletonBlock className="mt-4 h-3 w-44" />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BookingsLoading() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "suppliers" ? "suppliers" : "venues";

  return (
    <LoadingRegion
      label={
        view === "suppliers"
          ? "Loading supplier inquiries..."
          : "Loading bookings..."
      }
      className="bg-[#F8FAFC] text-[#111827]"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageHeaderSkeleton view={view} />
        <CustomerActivityTabs active={view} />
        <StatsSkeleton />
        {view === "suppliers" ? <SupplierFilterSkeleton /> : <VenueFilterSkeleton />}
        <div className="grid gap-5">
          {Array.from({ length: view === "suppliers" ? 2 : 3 }).map(
            (_, index) =>
              view === "suppliers" ? (
                <SupplierInquiryCardSkeleton key={index} />
              ) : (
                <VenueBookingCardSkeleton key={index} />
              ),
          )}
        </div>
      </div>
    </LoadingRegion>
  );
}
