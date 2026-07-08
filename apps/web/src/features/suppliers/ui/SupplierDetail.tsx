import {
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
import type { CustomerBookingOption } from "../application/get-customer-bookings-for-contact";
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
import { SupplierFavoriteButton } from "./SupplierFavoriteButton";

type SupplierDetailProps = {
  supplier: SupplierMarketplaceProfile;
  currentUser: User | null;
  bookings?: CustomerBookingOption[];
  isFavorited?: boolean;
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BadgeCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-black text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

export function SupplierDetail({
  supplier,
  currentUser,
  bookings = [],
  isFavorited = false,
}: SupplierDetailProps) {
  const heroImage = getSupplierHeroImage(supplier);
  const startingPrice = getSupplierStartingPrice(supplier);
  const startingPackage = supplier.packages.find(
    (pkg) => pkg.price === startingPrice,
  );
  const activePackages = supplier.packages.filter((pkg) => pkg.isActive);
  const featuredPortfolio = supplier.portfolio.slice(0, 6);

  return (
    <main className="bg-[#F8FAFC]">
      <section className="relative isolate min-h-[520px] overflow-hidden bg-slate-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.88)_0%,rgba(15,23,42,0.58)_48%,rgba(15,23,42,0.18)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[520px] w-full max-w-[1440px] items-end px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-4xl pb-4 text-white">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.1em] text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Accredited
              </span>
              {supplier.category ? (
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.1em] text-white ring-1 ring-white/20">
                  {supplier.category.name}
                </span>
              ) : null}
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {supplier.businessName}
            </h1>
            {supplier.headline ? (
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/90 sm:text-lg">
                {supplier.headline}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {currentUser ? (
                <SupplierFavoriteButton
                  supplierId={supplier.id}
                  supplierName={supplier.businessName}
                  initialIsFavorited={isFavorited}
                />
              ) : null}
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm font-black text-slate-950">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {formatRating(supplier.avgRating, supplier.reviewCount)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm font-black text-slate-950">
                <Clock3 className="h-4 w-4 text-[#2563EB]" />
                {formatResponseTime(supplier.responseTimeHours)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm font-black text-slate-950">
                <MapPin className="h-4 w-4 text-[#2563EB]" />
                {supplier.serviceAreas.slice(0, 2).join(", ") || "Location on request"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="min-w-0 space-y-8">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Supplier profile
                </h2>
                <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
                  {supplier.description || "This supplier is preparing their public profile."}
                </p>
              </div>
              <div className="rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] p-4">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-[#1D4ED8]">
                  Starting price
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {formatSupplierPrice(startingPrice)}
                </p>
                {startingPrice ? (
                  <p className="text-sm font-bold text-slate-600">
                    {formatPriceUnit(startingPackage?.priceUnit ?? supplier.priceUnit)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoRow
                icon={ShieldCheck}
                label="Accreditation"
                value={supplier.accreditationStatus}
              />
              <InfoRow
                icon={CalendarClock}
                label="Lead time"
                value={`${supplier.minimumBookingNoticeDays} days`}
              />
              <InfoRow
                icon={Users}
                label="Team"
                value={supplier.teamSize ? `${supplier.teamSize} people` : "On request"}
              />
              <InfoRow
                icon={Clock3}
                label="Response"
                value={formatResponseTime(supplier.responseTimeHours)}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Packages & pricing
                </h2>
                <p className="text-sm font-medium text-slate-500">
                  {activePackages.length} active package{activePackages.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {activePackages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                Package pricing is available on request.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activePackages.map((pkg) => (
                  <article
                    key={pkg.id}
                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.1em] text-[#1D4ED8]">
                          {pkg.packageType.replace(/_/g, " ")}
                        </p>
                        <h3 className="mt-1 text-lg font-black text-slate-950">
                          {pkg.name}
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-950">
                          {formatSupplierPrice(pkg.price)}
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                          {formatPriceUnit(pkg.priceUnit)}
                        </p>
                      </div>
                    </div>
                    {pkg.description ? (
                      <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                        {pkg.description}
                      </p>
                    ) : null}
                    {pkg.minGuests || pkg.maxGuests ? (
                      <p className="mt-3 text-sm font-bold text-slate-500">
                        {pkg.minGuests ?? 1}-{pkg.maxGuests ?? "Any"} guests
                      </p>
                    ) : null}
                    {pkg.inclusions.length > 0 ? (
                      <ul className="mt-4 grid gap-2">
                        {pkg.inclusions.slice(0, 6).map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-sm font-semibold text-slate-600"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Portfolio
            </h2>
            {featuredPortfolio.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                Portfolio work is not published yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {featuredPortfolio.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={`${item.title} portfolio image`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-black text-slate-950">{item.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {[item.eventType, item.city, item.province].filter(Boolean).join(" / ")}
                      </p>
                      {item.description ? (
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Reviews
            </h2>
            {supplier.reviews.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
                Reviews will appear after completed supplier bookings.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {supplier.reviews.slice(0, 4).map((review) => (
                  <article
                    key={review.id}
                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-3 flex items-center gap-1 text-amber-500">
                      {Array.from({ length: review.overallRating }).map((_, index) => (
                        <Star key={index} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm font-medium leading-6 text-slate-700">
                      {review.comment ?? "Verified supplier booking."}
                    </p>
                    <p className="mt-4 text-sm font-black text-slate-950">
                      {review.customerName}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <SupplierContactForm
            supplier={supplier}
            userEmail={currentUser?.email ?? null}
            bookings={bookings}
          />

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Contact information</h2>
            <div className="mt-4 grid gap-3">
              {supplier.contactEmail ? (
                <a
                  href={`mailto:${supplier.contactEmail}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#2563EB] hover:text-[#1D4ED8]"
                >
                  <Mail className="h-4 w-4 text-[#2563EB]" />
                  {supplier.contactEmail}
                </a>
              ) : null}
              {supplier.contactPhone ? (
                <a
                  href={`tel:${supplier.contactPhone}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#2563EB] hover:text-[#1D4ED8]"
                >
                  <Phone className="h-4 w-4 text-[#2563EB]" />
                  {supplier.contactPhone}
                </a>
              ) : null}
              {supplier.websiteUrl ? (
                <a
                  href={supplier.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#2563EB] hover:text-[#1D4ED8]"
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
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#2563EB] hover:text-[#1D4ED8]"
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
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm font-semibold text-slate-500">
                  Public contact details are pending.
                </p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
