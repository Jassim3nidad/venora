"use client";

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
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
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
import { SupplierRequestSidebar } from "./SupplierRequestSidebar";
import { SupplierFavoriteButton } from "./SupplierFavoriteButton";
import { Button, Badge, Separator } from "@venora/ui";
import VenueGallery from "@/src/features/venues/ui/VenueGallery";

type SupplierDetailProps = {
  supplier: SupplierMarketplaceProfile;
  currentUser: User | null;
  bookings?: CustomerBookingOption[];
  isFavorited?: boolean;
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
    <div className="flex items-start gap-3 rounded-[20px] border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#EFF6FF] text-[#2563EB]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
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
    <div className="rounded-[24px] border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-8 text-center text-sm font-semibold text-[#6B7280]">
      {message}
    </div>
  );
}

export function SupplierDetail({
  supplier,
  currentUser,
  bookings = [],
  isFavorited = false,
}: SupplierDetailProps) {
  const isOwner = currentUser?.id === supplier.profileId;
  const startingPrice = getSupplierStartingPrice(supplier);
  const startingPackage = supplier.packages.find(
    (pkg) => pkg.price === startingPrice,
  );
  const activePackages = supplier.packages.filter((pkg) => pkg.isActive);
  const featuredPortfolio = supplier.portfolio.slice(0, 6);
  const serviceAreas = supplier.serviceAreas;

  // Transform supplier images to VenueGallery format
  const galleryMedia = [];
  let displayOrder = 1;
  
  if (supplier.heroImageUrl) {
    galleryMedia.push({
      id: "cover-image",
      storage_path: supplier.heroImageUrl,
      media_type: "image" as const,
      alt_text: "Cover Image",
      display_order: displayOrder++,
      is_featured: true,
    });
  }

  // Add portfolio images to gallery
  featuredPortfolio.forEach((item) => {
    if (item.imageUrls && item.imageUrls.length > 0) {
      item.imageUrls.forEach((url, i) => {
        galleryMedia.push({
          id: `portfolio-${item.id}-${i}`,
          storage_path: url,
          media_type: "image" as const,
          alt_text: item.title || "Portfolio Work",
          display_order: displayOrder++,
          is_featured: false,
        });
      });
    } else if (item.imageUrl) {
      galleryMedia.push({
        id: `portfolio-${item.id}`,
        storage_path: item.imageUrl,
        media_type: "image" as const,
        alt_text: item.title || "Portfolio Work",
        display_order: displayOrder++,
        is_featured: false,
      });
    }
  });

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 pb-28 pt-6 font-sans sm:px-6 sm:pt-8 lg:px-8 lg:pb-12 bg-white">
      {/* Top Header info (matching VenueDetails) */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden h-10 gap-2 rounded-full px-0 hover:bg-transparent sm:flex text-[#6B7280] hover:text-[#111827]"
          >
            <Link href="/suppliers">
              <ArrowLeft className="h-4 w-4" />
              Back to suppliers
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="icon"
            className="flex h-10 w-10 shrink-0 rounded-full border-[#E5E7EB] sm:hidden text-[#6B7280]"
          >
            <Link href="/suppliers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        {/* Action Controls */}
        <div className="hidden items-center gap-3 md:flex">
          {!isOwner && (
            <SupplierFavoriteButton
              supplierId={supplier.id}
              supplierName={supplier.businessName}
              initialIsFavorited={isFavorited}
            />
          )}
        </div>
      </div>

      {/* Gallery Section */}
      <VenueGallery media={galleryMedia} venueName={supplier.businessName} />

      {/* Identity Header */}
      <div className="relative -mt-10 sm:-mt-12 flex flex-col items-start px-2 sm:px-4 mb-4 z-10">
        <div className="h-24 w-24 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md sm:shadow-lg">
          {supplier.profileImageUrl ? (
            <img
              src={supplier.profileImageUrl}
              alt={`${supplier.businessName} logo`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-200 text-2xl font-bold text-slate-400">
              {supplier.businessName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="mt-4 flex w-full flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-700"
            >
              <BadgeCheck className="mr-1 h-3 w-3" />
              Accredited
            </Badge>
            {supplier.category ? (
              <Badge
                variant="outline"
                className="border-[#DBEAFE] bg-[#EFF6FF] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2563EB]"
              >
                {supplier.category.name}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-1 text-3xl font-black leading-tight tracking-[-0.04em] text-slate-950 md:text-4xl">
            {supplier.businessName}
          </h1>
          {supplier.headline ? (
            <p className="mt-1 max-w-2xl text-base font-semibold leading-relaxed text-[#4B5563]">
              {supplier.headline}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-[#6B7280]">
            {supplier.reviewCount > 0 ? (
              <span className="flex items-center gap-1.5 font-bold text-[#111827]">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {formatRating(supplier.avgRating, supplier.reviewCount)}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold text-[#111827]">
                <Star className="h-4 w-4 text-slate-300" />
                New on Venora
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#2563EB]" />
              {serviceAreas.slice(0, 2).join(", ") || "Location on request"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 gap-10 items-start lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-10 lg:col-span-2">
          
          {/* About Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
              About the supplier
            </h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-base font-medium leading-relaxed text-[#4B5563]">
                {supplier.description ||
                  "This supplier is preparing their public profile."}
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoCard
                icon={ShieldCheck}
                label="Status"
                value={supplier.accreditationStatus}
              />
              <InfoCard
                icon={CalendarClock}
                label="Lead time"
                value={`${supplier.minimumBookingNoticeDays || 7} days notice`}
              />
              <InfoCard
                icon={Users}
                label="Team Size"
                value={
                  supplier.teamSize ? `${supplier.teamSize} people` : "On request"
                }
              />
              <InfoCard
                icon={Clock3}
                label="Response Time"
                value={formatResponseTime(supplier.responseTimeHours)}
              />
            </div>
          </section>

          <Separator className="bg-slate-200/60" />

          {/* Services and Pricing */}
          <section className="space-y-6">
            <div className="flex flex-col justify-between sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                  Services and Pricing
                </h2>
                <p className="mt-1 text-sm font-medium text-[#6B7280]">
                  {activePackages.length} active service{activePackages.length === 1 ? "" : "s"} available
                </p>
              </div>
            </div>

            {activePackages.length === 0 ? (
              <EmptyPanel message="This supplier has not published any services yet." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {activePackages.map((pkg) => (
                  <article
                    key={pkg.id}
                    className="flex flex-col justify-between rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/70 transition hover:border-[#BFDBFE]"
                  >
                    <div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="border-[#DBEAFE] bg-[#EFF6FF] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#2563EB]"
                        >
                          {pkg.packageType.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <h3 className="break-words text-lg font-black leading-tight text-[#111827]">
                        {pkg.name}
                      </h3>
                      <div className="mt-2 text-sm font-bold text-[#6B7280]">
                        Starting at <span className="text-base text-[#111827]">{formatSupplierPrice(pkg.price)}</span>{" "}
                        <span className="font-medium">{formatPriceUnit(pkg.priceUnit)}</span>
                      </div>
                      {pkg.description ? (
                        <p className="mt-3 break-words text-sm font-medium leading-relaxed text-[#4B5563]">
                          {pkg.description}
                        </p>
                      ) : null}
                      
                      {pkg.inclusions.length > 0 ? (
                        <ul className="mt-4 space-y-2">
                          {pkg.inclusions.slice(0, 4).map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2 text-sm font-semibold text-[#4B5563]"
                            >
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                              <span className="min-w-0 break-words">{item}</span>
                            </li>
                          ))}
                          {pkg.inclusions.length > 4 && (
                            <li className="text-xs font-bold text-[#6B7280]">
                              + {pkg.inclusions.length - 4} more inclusions
                            </li>
                          )}
                        </ul>
                      ) : null}
                    </div>
                    
                    {!isOwner && (
                      <Button
                        variant="outline"
                        className="mt-6 w-full rounded-xl border-[#E5E7EB] font-bold text-[#111827] hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                        asChild
                      >
                        <a href="#supplier-request-card">Request Proposal</a>
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <Separator className="bg-slate-200/60" />

          {/* Portfolio Section */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                Portfolio
              </h2>
              <p className="mt-1 text-sm font-medium text-[#6B7280]">
                See past projects and work samples
              </p>
            </div>

            {featuredPortfolio.length === 0 ? (
              <EmptyPanel message="No portfolio projects have been published yet." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {featuredPortfolio.map((item) => (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      {item.imageUrls && item.imageUrls.length > 1 ? (
                        <div className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth no-scrollbar">
                          {item.imageUrls.map((url, idx) => (
                            <div key={idx} className="h-full min-w-full shrink-0 snap-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`${item.title} portfolio image ${idx + 1}`}
                                className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.imageUrl || undefined}
                          alt={`${item.title} portfolio image`}
                          className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                          loading="lazy"
                        />
                      )}
                      {item.imageUrls && item.imageUrls.length > 1 && (
                        <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                          1 / {item.imageUrls.length}
                        </div>
                      )}
                    </div>
                    <div className="p-4 sm:p-5">
                      <h3 className="break-words text-base font-black text-[#111827] group-hover:text-[#2563EB] transition-colors">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        {[item.eventType, item.city, item.province]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                      {item.description ? (
                        <p className="mt-2 line-clamp-2 break-words text-sm font-medium leading-relaxed text-[#4B5563]">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <Separator className="bg-slate-200/60" />

          {/* Service Coverage Section */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                Service Coverage
              </h2>
            </div>
            
            {serviceAreas.length > 0 ? (
              <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-sm shadow-slate-200/70">
                <div className="flex flex-wrap gap-2">
                  {serviceAreas.map((area) => (
                    <Badge
                      key={area}
                      variant="secondary"
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                      <MapPin className="mr-1.5 h-3.5 w-3.5" />
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyPanel message="Service coverage areas are not specified." />
            )}
          </section>

          <Separator className="bg-slate-200/60" />

          {/* Reviews Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                  Reviews
                </h2>
                {supplier.reviewCount > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-sm font-bold text-[#111827]">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {supplier.avgRating.toFixed(1)} · {supplier.reviewCount} verified reviews
                  </p>
                )}
              </div>
            </div>

            {supplier.reviews.length === 0 ? (
              <EmptyPanel message="New on Venora. This supplier has not received a verified review yet." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {supplier.reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/70"
                  >
                    <div className="mb-3 flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.overallRating ? "fill-current" : "text-slate-200"}`}
                        />
                      ))}
                    </div>
                    <p className="break-words text-sm font-medium leading-relaxed text-[#4B5563]">
                      &quot;{review.comment ?? "Verified supplier booking."}&quot;
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {review.customerName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#111827]">
                          {review.customerName}
                        </p>
                        <p className="text-xs font-semibold text-[#6B7280]">
                          Verified Booking
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column - Sidebar */}
        <div className="relative">
          <SupplierRequestSidebar 
            supplier={supplier}
            supplierSlug={supplier.slug}
            userEmail={currentUser?.email}
            bookings={bookings}
            isOwner={isOwner}
          />

          {/* Privacy-friendly Business Links */}
          <div className="mt-6 rounded-3xl border border-[#E5E7EB] bg-[#F9FAFB] p-6 shadow-sm">
            <h3 className="mb-4 text-base font-black text-[#111827]">
              Business Links
            </h3>
            <div className="grid gap-3">
              {supplier.websiteUrl ? (
                <a
                  href={supplier.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                >
                  <Globe className="h-4 w-4 text-[#2563EB]" />
                  Website
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-[#9CA3AF]" />
                </a>
              ) : null}
              {supplier.instagramUrl ? (
                <a
                  href={supplier.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                >
                  <Instagram className="h-4 w-4 text-[#2563EB]" />
                  Instagram
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-[#9CA3AF]" />
                </a>
              ) : null}
              
              {/* Only show email/phone if explicitly populated as public fields, Venora focuses on on-platform inquiries */}
              {supplier.contactEmail && (
                 <a
                 href={`mailto:${supplier.contactEmail}`}
                 className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
               >
                 <Mail className="h-4 w-4 shrink-0 text-[#2563EB]" />
                 <span className="min-w-0 break-all">{supplier.contactEmail}</span>
               </a>
              )}
              {supplier.contactPhone && (
                 <a
                 href={`tel:${supplier.contactPhone}`}
                 className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
               >
                 <Phone className="h-4 w-4 shrink-0 text-[#2563EB]" />
                 <span className="min-w-0 break-all">{supplier.contactPhone}</span>
               </a>
              )}

              {!supplier.websiteUrl && !supplier.instagramUrl && !supplier.contactEmail && !supplier.contactPhone && (
                <p className="text-sm font-medium text-[#6B7280]">
                  No external links available.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile sticky action */}
      {!isOwner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white p-4 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                Starting at
              </span>
              <span className="text-lg font-black text-slate-950">
                {formatSupplierPrice(startingPrice) || "Price on request"}
              </span>
            </div>
            <Button
              className="h-12 flex-1 rounded-2xl font-bold bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
              asChild
            >
              <a href="#supplier-request-card">Request Proposal</a>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
