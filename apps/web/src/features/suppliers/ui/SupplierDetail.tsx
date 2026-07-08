import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Check,
  Clock3,
  ExternalLink,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { SupplierMarketplaceProfile } from "../types/supplier.types";
import {
  getSupplierHeroImage,
  getSupplierStartingPrice,
} from "../utils/supplier-derive";
import {
  formatPriceUnit,
  formatRating,
  formatResponseTime,
  formatSupplierPrice,
} from "../utils/supplier-format";
import { SupplierContactForm } from "./SupplierContactForm";

type SupplierDetailProps = {
  supplier: SupplierMarketplaceProfile;
  currentUser: User | null;
};

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BadgeCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-black text-[#111827]">
          {value}
        </p>
      </div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#BFDBFE] bg-white p-8 text-center text-sm font-semibold text-[#6B7280]">
      {message}
    </div>
  );
}

export function SupplierDetail({ supplier, currentUser }: SupplierDetailProps) {
  const heroImage = getSupplierHeroImage(supplier);
  const startingPrice = getSupplierStartingPrice(supplier);
  const startingPackage = supplier.packages.find(
    (pkg) => pkg.price === startingPrice,
  );
  const activePackages = supplier.packages.filter((pkg) => pkg.isActive);
  const featuredPortfolio = supplier.portfolio.slice(0, 6);
  const serviceAreas = supplier.serviceAreas.slice(0, 4);

  return (
    <main className="overflow-x-hidden bg-[#F8FAFC]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/suppliers"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to suppliers
        </Link>

        <section className="min-w-0 overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70 sm:rounded-[32px]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_440px]">
            <div className="flex min-w-0 flex-col justify-between gap-6 p-4 sm:gap-8 sm:p-7 lg:p-8">
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Accredited
                  </span>
                  {supplier.category ? (
                    <span className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#2563EB]">
                      {supplier.category.name}
                    </span>
                  ) : null}
                </div>

                <h1 className="max-w-3xl break-words text-3xl font-black leading-tight tracking-[-0.04em] text-[#111827] sm:text-5xl lg:tracking-[-0.05em]">
                  {supplier.businessName}
                </h1>
                {supplier.headline ? (
                  <p className="mt-4 max-w-2xl break-words text-sm font-semibold leading-7 text-[#4B5563] sm:text-base">
                    {supplier.headline}
                  </p>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 text-sm font-black text-[#111827]">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="min-w-0 break-words">
                      {formatRating(supplier.avgRating, supplier.reviewCount)}
                    </span>
                  </span>
                  <span className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 text-sm font-black text-[#111827]">
                    <Clock3 className="h-4 w-4 text-[#2563EB]" />
                    <span className="min-w-0 break-words">
                      {formatResponseTime(supplier.responseTimeHours)}
                    </span>
                  </span>
                  <span className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 text-sm font-black text-[#111827]">
                    <MapPin className="h-4 w-4 shrink-0 text-[#2563EB]" />
                    <span className="min-w-0 break-words">
                      {serviceAreas.slice(0, 2).join(", ") ||
                        "Location on request"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="#contact-supplier"
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8] sm:w-auto"
                >
                  Contact Supplier
                </a>
                <Link
                  href="/suppliers"
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#111827] shadow-sm transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] sm:w-auto"
                >
                  Browse More Suppliers
                </Link>
              </div>
            </div>

            <div className="relative h-64 overflow-hidden bg-[#EFF6FF] sm:h-80 lg:h-auto lg:min-h-[480px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt={supplier.businessName}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/40 to-transparent" />
            </div>
          </div>
        </section>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="grid min-w-0 gap-6">
            <section className="min-w-0 rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                <div className="min-w-0">
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                    About this supplier
                  </h2>
                  <p className="mt-3 max-w-3xl break-words text-sm font-medium leading-7 text-[#4B5563] sm:text-base">
                    {supplier.description ||
                      "This supplier is preparing their public profile."}
                  </p>
                </div>
                <div className="min-w-0 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1D4ED8]">
                    Starting price
                  </p>
                  <p className="mt-1 break-words text-2xl font-black text-[#111827]">
                    {formatSupplierPrice(startingPrice)}
                  </p>
                  {startingPrice ? (
                    <p className="text-sm font-bold text-[#6B7280]">
                      {formatPriceUnit(
                        startingPackage?.priceUnit ?? supplier.priceUnit,
                      )}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  icon={ShieldCheck}
                  label="Status"
                  value={supplier.accreditationStatus}
                />
                <InfoCard
                  icon={CalendarClock}
                  label="Lead time"
                  value={`${supplier.minimumBookingNoticeDays} days`}
                />
                <InfoCard
                  icon={Users}
                  label="Team"
                  value={
                    supplier.teamSize
                      ? `${supplier.teamSize} people`
                      : "On request"
                  }
                />
                <InfoCard
                  icon={Clock3}
                  label="Response"
                  value={formatResponseTime(supplier.responseTimeHours)}
                />
              </div>
            </section>

            <section className="grid gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                  Packages & pricing
                </h2>
                <p className="mt-1 text-sm font-medium text-[#6B7280]">
                  {activePackages.length} active package
                  {activePackages.length === 1 ? "" : "s"}
                </p>
              </div>

              {activePackages.length === 0 ? (
                <EmptyPanel message="Package pricing is available on request." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activePackages.map((pkg) => (
                    <article
                      key={pkg.id}
                      className="min-w-0 rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5"
                    >
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#2563EB]">
                            {pkg.packageType.replace(/_/g, " ")}
                          </p>
                          <h3 className="mt-1 break-words text-lg font-black text-[#111827]">
                            {pkg.name}
                          </h3>
                        </div>
                        <div className="shrink-0 sm:text-right">
                          <p className="break-words text-lg font-black text-[#111827]">
                            {formatSupplierPrice(pkg.price)}
                          </p>
                          <p className="text-xs font-bold text-[#6B7280]">
                            {formatPriceUnit(pkg.priceUnit)}
                          </p>
                        </div>
                      </div>
                      {pkg.description ? (
                        <p className="mt-3 break-words text-sm font-medium leading-6 text-[#4B5563]">
                          {pkg.description}
                        </p>
                      ) : null}
                      {pkg.minGuests || pkg.maxGuests ? (
                        <p className="mt-3 text-sm font-bold text-[#6B7280]">
                          {pkg.minGuests ?? 1}-{pkg.maxGuests ?? "Any"} guests
                        </p>
                      ) : null}
                      {pkg.inclusions.length > 0 ? (
                        <ul className="mt-4 grid gap-2">
                          {pkg.inclusions.slice(0, 6).map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2 text-sm font-semibold text-[#4B5563]"
                            >
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                              <span className="min-w-0 break-words">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {serviceAreas.length > 0 ? (
              <section className="min-w-0 rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-6">
                <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                  Service areas
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {serviceAreas.map((area) => (
                    <span
                      key={area}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-sm font-bold text-[#1D4ED8]"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 break-words">{area}</span>
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="grid gap-4">
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                Portfolio
              </h2>
              {featuredPortfolio.length === 0 ? (
                <EmptyPanel message="Portfolio work is not published yet." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {featuredPortfolio.map((item) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-[#EFF6FF]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={`${item.title} portfolio image`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 p-4">
                        <h3 className="break-words font-black text-[#111827]">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-[#6B7280]">
                          {[item.eventType, item.city, item.province]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                        {item.description ? (
                          <p className="mt-2 break-words text-sm font-medium leading-6 text-[#4B5563]">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-4">
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                Reviews
              </h2>
              {supplier.reviews.length === 0 ? (
                <EmptyPanel message="Reviews will appear after completed supplier bookings." />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {supplier.reviews.slice(0, 4).map((review) => (
                    <article
                      key={review.id}
                      className="min-w-0 rounded-[24px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5"
                    >
                      <div className="mb-3 flex items-center gap-1 text-amber-500">
                        {Array.from({ length: review.overallRating }).map(
                          (_, index) => (
                            <Star
                              key={index}
                              className="h-4 w-4 fill-current"
                            />
                          ),
                        )}
                      </div>
                      <p className="break-words text-sm font-medium leading-6 text-[#4B5563]">
                        {review.comment ?? "Verified supplier booking."}
                      </p>
                      <p className="mt-4 text-sm font-black text-[#111827]">
                        {review.customerName}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside
            id="contact-supplier"
            className="grid min-w-0 gap-4 lg:sticky lg:top-24 lg:self-start"
          >
            <SupplierContactForm
              supplier={supplier}
              userEmail={currentUser?.email ?? null}
            />

            <section className="min-w-0 rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5">
              <h2 className="text-lg font-black text-[#111827]">
                Contact information
              </h2>
              <div className="mt-4 grid gap-3">
                {supplier.contactEmail ? (
                  <a
                    href={`mailto:${supplier.contactEmail}`}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#E5E7EB] px-3 py-3 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-[#2563EB]" />
                    <span className="min-w-0 break-all">
                      {supplier.contactEmail}
                    </span>
                  </a>
                ) : null}
                {supplier.contactPhone ? (
                  <a
                    href={`tel:${supplier.contactPhone}`}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#E5E7EB] px-3 py-3 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-[#2563EB]" />
                    <span className="min-w-0 break-all">
                      {supplier.contactPhone}
                    </span>
                  </a>
                ) : null}
                {supplier.websiteUrl ? (
                  <a
                    href={supplier.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-3 py-3 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                  >
                    <Globe className="h-4 w-4 text-[#2563EB]" />
                    Website
                    <ExternalLink className="ml-auto h-3.5 w-3.5" />
                  </a>
                ) : null}
                {supplier.instagramUrl ? (
                  <a
                    href={supplier.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-3 py-3 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                  >
                    <Instagram className="h-4 w-4 text-[#2563EB]" />
                    Instagram
                    <ExternalLink className="ml-auto h-3.5 w-3.5" />
                  </a>
                ) : null}
                {!supplier.contactEmail &&
                !supplier.contactPhone &&
                !supplier.websiteUrl &&
                !supplier.instagramUrl ? (
                  <p className="rounded-2xl border border-dashed border-[#BFDBFE] bg-[#F9FAFB] px-3 py-4 text-sm font-semibold text-[#6B7280]">
                    Public contact details are pending.
                  </p>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
