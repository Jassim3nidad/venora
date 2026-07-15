"use client";

import { useState } from "react";

import Link from "next/link";
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
  Images,
  Camera,
  BriefcaseBusiness,
  ArrowUpRight,
  Send,
  ChevronLeft,
  ChevronRight,
  X,
  CalendarDays,
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
import { SupplierRequestSidebar } from "./SupplierRequestSidebar";
import { SupplierFavoriteButton } from "./SupplierFavoriteButton";
import {
  Button,
  Badge,
  Separator,
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogClose,
} from "@venora/ui";
import VenueGallery from "@/src/features/venues/ui/VenueGallery";
import dynamic from "next/dynamic";

const VenueMap = dynamic(() => import("@/src/components/VenueMap"), {
  ssr: false,
});

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

function EmptyPanel({
  message,
  icon,
}: {
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-8 text-center sm:p-10">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <p className="text-sm font-semibold text-[#6B7280]">{message}</p>
    </div>
  );
}

function PortfolioProjectModal({
  project,
  isOpen,
  onOpenChange,
}: {
  project: any; // using any temporarily to avoid circular types if needed, or import type
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images =
    project.imageUrls && project.imageUrls.length > 0
      ? project.imageUrls
      : project.imageUrl
        ? [project.imageUrl]
        : [];

  const handleNext = () =>
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const handlePrev = () =>
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white sm:rounded-[24px]">
        <div className="flex flex-col h-[85vh] sm:h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <DialogTitle className="text-lg font-black text-slate-900 line-clamp-1 pr-8">
              {project.title || "Portfolio Project"}
            </DialogTitle>
            <DialogClose asChild>
              <button
                className="rounded-full p-2 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </DialogClose>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {/* Gallery */}
            {images.length > 0 ? (
              <div className="relative bg-slate-100 w-full aspect-video sm:aspect-[16/9] flex items-center justify-center group">
                <img
                  src={images[currentImageIndex]}
                  alt={`${project.title} - image ${currentImageIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                />

                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrev}
                      className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow-md backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow-md backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-4 right-4 rounded-md bg-black/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                      {currentImageIndex + 1} of {images.length}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full aspect-video bg-slate-100 flex items-center justify-center">
                <Images className="h-10 w-10 text-slate-300" />
              </div>
            )}

            {/* Details */}
            <div className="p-5 sm:p-8 space-y-6">
              {/* Metadata */}
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {project.eventType && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <BriefcaseBusiness className="h-4 w-4" />
                    {project.eventType}
                  </div>
                )}
                {(project.city || project.province) && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <MapPin className="h-4 w-4" />
                    {[project.city, project.province]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
                {project.eventDate && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <CalendarDays className="h-4 w-4" />
                    Completed{" "}
                    {new Date(project.eventDate).toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                )}
              </div>

              {/* Story */}
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                  About this project
                </h3>
                {project.description ? (
                  <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {project.description}
                  </p>
                ) : (
                  <p className="text-sm italic text-slate-400">
                    Project details have not been added yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          {project.serviceId && (
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-xl"
                onClick={() => {
                  onOpenChange(false);
                  window.dispatchEvent(
                    new CustomEvent("venora:select-service", {
                      detail: { serviceId: project.serviceId },
                    }),
                  );
                  document
                    .getElementById("supplier-request-card")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Request Similar Service
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
  const publicPortfolio = [...supplier.portfolio]
    .filter((item) => item.status === "published")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const serviceAreas = supplier.serviceAreas;

  const [selectedProject, setSelectedProject] = useState<any | null>(null);

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
  publicPortfolio.slice(0, 6).forEach((item) => {
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
    <main className="mx-auto max-w-7xl space-y-8 bg-white px-4 pb-28 pt-6 font-sans sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">
      {/* Top Header info (matching VenueDetails) */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-end">
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

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 items-start gap-8 pt-4 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-10">
        {/* Left Column */}
        <div className="min-w-0 space-y-8">
          {/* Identity Header */}
          <div className="relative flex flex-col items-start mb-4 z-10">
            <div
              className="relative h-24 w-24 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md sm:shadow-lg -mt-16 sm:-mt-24"
              aria-label={`${supplier.businessName} logo`}
            >
              <div className="flex h-full w-full items-center justify-center bg-slate-200 text-2xl font-bold text-slate-400">
                {supplier.businessName.charAt(0).toUpperCase()}
              </div>
              {supplier.profileImageUrl ? (
                <img
                  src={supplier.profileImageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
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
                  supplier.teamSize
                    ? `${supplier.teamSize} people`
                    : "On request"
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
          <section className="space-y-5">
            <div className="flex flex-col justify-between sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                  Services and Pricing
                </h2>
                <p className="mt-1 text-sm font-medium text-[#6B7280]">
                  {activePackages.length} active service
                  {activePackages.length === 1 ? "" : "s"} available
                </p>
              </div>
            </div>

            {activePackages.length === 0 ? (
              <EmptyPanel message="This supplier has not published any services yet." />
            ) : (
              <div
                className={
                  activePackages.length === 1
                    ? "grid gap-4"
                    : "grid gap-4 sm:grid-cols-2"
                }
              >
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
                        Starting at{" "}
                        <span className="text-base text-[#111827]">
                          {formatSupplierPrice(pkg.price)}
                        </span>{" "}
                        <span className="font-medium">
                          {formatPriceUnit(pkg.priceUnit)}
                        </span>
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
                              <span className="min-w-0 break-words">
                                {item}
                              </span>
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
          <section className="space-y-5">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                Portfolio
              </h2>
              <p className="mt-1 text-sm font-medium text-[#6B7280]">
                Explore completed projects and examples of this supplier’s work.
              </p>
            </div>

            {publicPortfolio.length === 0 ? (
              <EmptyPanel
                message="No portfolio projects have been published yet."
                icon={<Images className="h-8 w-8 text-slate-300" />}
              />
            ) : (
              <div
                className={
                  publicPortfolio.length === 1
                    ? "grid gap-4"
                    : publicPortfolio.length === 2
                      ? "grid gap-4 sm:grid-cols-2"
                      : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                }
              >
                {publicPortfolio.map((item) => {
                  const images =
                    item.imageUrls && item.imageUrls.length > 0
                      ? item.imageUrls
                      : item.imageUrl
                        ? [item.imageUrl]
                        : [];
                  const hasImages = images.length > 0;
                  const isFeaturedLayout = publicPortfolio.length === 1;

                  return (
                    <article
                      key={item.id}
                      className={
                        isFeaturedLayout
                          ? "group overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70 md:grid md:grid-cols-[60%_40%]"
                          : "group overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70 flex flex-col"
                      }
                    >
                      {/* Image Area */}
                      <button
                        onClick={() => setSelectedProject(item)}
                        className={
                          isFeaturedLayout
                            ? "relative h-[280px] w-full overflow-hidden bg-slate-100 sm:h-[320px] md:h-[400px] block text-left"
                            : "relative aspect-[4/3] w-full overflow-hidden bg-slate-100 block text-left"
                        }
                      >
                        {hasImages ? (
                          <img
                            src={images[0]}
                            alt={`${item.title || "Project"} cover`}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Images className="h-8 w-8 text-slate-300" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />

                        {/* Top left badges */}
                        <div className="absolute left-3 top-3 flex flex-col gap-2 items-start">
                          {item.isFeatured && (
                            <div className="rounded-full bg-amber-100/95 px-2.5 py-1 text-[11px] font-bold text-amber-700 shadow-sm backdrop-blur flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current" />
                              Featured Project
                            </div>
                          )}
                        </div>

                        {/* Bottom right photo count */}
                        {hasImages && (
                          <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur flex items-center gap-1.5">
                            <Images className="h-3 w-3" />
                            {images.length} photo
                            {images.length !== 1 ? "s" : ""}
                          </div>
                        )}
                      </button>

                      {/* Content Area */}
                      <div className="flex flex-col p-5 sm:p-6 flex-1">
                        <div className="flex-1">
                          <h3
                            className="text-lg font-black text-[#111827] group-hover:text-[#2563EB] transition-colors cursor-pointer line-clamp-1"
                            onClick={() => setSelectedProject(item)}
                          >
                            {item.title || "Portfolio Project"}
                          </h3>

                          <div className="mt-2 space-y-1.5">
                            {item.eventType && (
                              <p className="text-xs font-semibold text-slate-600 line-clamp-1">
                                {item.eventType}
                              </p>
                            )}
                            {(item.city || item.province) && (
                              <p className="text-xs font-semibold text-slate-600 line-clamp-1">
                                {[item.city, item.province]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            )}
                            {item.eventDate && (
                              <p className="text-xs font-semibold text-slate-600 line-clamp-1">
                                Completed{" "}
                                {new Date(item.eventDate).toLocaleDateString(
                                  undefined,
                                  { month: "long", year: "numeric" },
                                )}
                              </p>
                            )}
                          </div>

                          {item.description && (
                            <p
                              className={
                                isFeaturedLayout
                                  ? "mt-4 line-clamp-3 text-sm font-medium leading-relaxed text-[#4B5563]"
                                  : "mt-4 line-clamp-2 text-sm font-medium leading-relaxed text-[#4B5563]"
                              }
                            >
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="min-w-0 flex-1 pr-2">
                            {item.serviceId ? (
                              <p className="text-xs font-semibold text-slate-500 truncate flex items-center gap-1.5">
                                <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                  Linked to a service
                                </span>
                              </p>
                            ) : null}
                          </div>

                          <button
                            className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
                            onClick={() => setSelectedProject(item)}
                          >
                            View Project
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {selectedProject && (
              <PortfolioProjectModal
                project={selectedProject}
                isOpen={!!selectedProject}
                onOpenChange={(open) => {
                  if (!open) setSelectedProject(null);
                }}
              />
            )}
          </section>

          <Separator className="bg-slate-200/60" />

          {/* Service Location & Coverage Section */}
          <section className="space-y-5">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                Service Location & Coverage
              </h2>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70">
              <div className="p-5 sm:p-6 border-b border-[#E5E7EB]">
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
                      Location Type
                    </h3>
                    <p className="mt-1 text-sm font-bold text-[#111827] capitalize">
                      {supplier.businessLocationType?.replace(/_/g, " ") ||
                        "Mobile / We come to you"}
                    </p>
                  </div>
                  {supplier.coverageRadiusKm != null &&
                    supplier.coverageRadiusKm > 0 && (
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280]">
                          Coverage Radius
                        </h3>
                        <p className="mt-1 text-sm font-bold text-[#111827]">
                          {supplier.coverageRadiusKm} km
                        </p>
                      </div>
                    )}
                </div>

                {supplier.travelAvailable && supplier.travelFeeNote && (
                  <div className="mb-4 rounded-xl bg-purple-50 p-4 border border-purple-100">
                    <p className="text-sm font-bold text-purple-900">
                      Travel available: {supplier.travelFeeNote}
                    </p>
                  </div>
                )}

                {serviceAreas.length > 0 && (
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#6B7280] mb-2">
                      Service Areas
                    </h3>
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
                )}
              </div>

              {supplier.locationVisibility !== "service_area_only" &&
                supplier.latitude &&
                supplier.longitude && (
                  <div className="w-full bg-slate-50 relative">
                    {supplier.locationVisibility === "approximate" && (
                      <div className="absolute top-4 left-4 z-10 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
                        Approximate Location
                      </div>
                    )}
                    <VenueMap
                      latitude={supplier.latitude}
                      longitude={supplier.longitude}
                      markerLabel={supplier.businessName}
                      height="260px"
                    />
                  </div>
                )}
            </div>
          </section>

          {/* Find This Business Online */}
          {(supplier.websiteUrl || supplier.instagramUrl) && (
            <>
              <Separator className="bg-slate-200/60" />
              <section className="space-y-3">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                    Find This Business Online
                  </h2>
                  <p className="hidden">
                    Explore the supplier’s official website and social profiles.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {supplier.websiteUrl && (
                    <a
                      href={supplier.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                      aria-label={`Visit ${supplier.businessName} website`}
                    >
                      <Globe className="h-4 w-4 text-[#2563EB]" />
                      Website
                      <ExternalLink className="h-3.5 w-3.5 text-[#9CA3AF]" />
                    </a>
                  )}
                  {supplier.instagramUrl && (
                    <a
                      href={supplier.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                      aria-label={`Open ${supplier.businessName} Instagram profile`}
                    >
                      <Instagram className="h-4 w-4 text-[#2563EB]" />
                      Instagram
                      <ExternalLink className="h-3.5 w-3.5 text-[#9CA3AF]" />
                    </a>
                  )}
                  {false && supplier.contactEmail && (
                    <a
                      href={`mailto:${supplier.contactEmail}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                      aria-label={`Email ${supplier.businessName} at ${supplier.contactEmail}`}
                    >
                      <Mail className="h-4 w-4 shrink-0 text-[#2563EB]" />
                      <span className="min-w-0 break-all">
                        {supplier.contactEmail}
                      </span>
                    </a>
                  )}
                  {false && supplier.contactPhone && (
                    <a
                      href={`tel:${supplier.contactPhone}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#4B5563] transition hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                      aria-label={`Call ${supplier.businessName} at ${supplier.contactPhone}`}
                    >
                      <Phone className="h-4 w-4 shrink-0 text-[#2563EB]" />
                      <span className="min-w-0 break-all">
                        {supplier.contactPhone}
                      </span>
                    </a>
                  )}
                </div>
              </section>
            </>
          )}

          <Separator className="bg-slate-200/60" />

          {/* Reviews Section */}
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-[#111827]">
                  Reviews
                </h2>
                {supplier.reviewCount > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-sm font-bold text-[#111827]">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {supplier.avgRating.toFixed(1)} · {supplier.reviewCount}{" "}
                    verified reviews
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
                      &quot;{review.comment ?? "Verified supplier booking."}
                      &quot;
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

        {/* Right Column - Sidebar (sticky container) */}
        <aside className="hidden lg:self-stretch lg:block">
          <div className="sticky top-[9.5rem] self-start">
            <SupplierRequestSidebar
              supplier={supplier}
              supplierSlug={supplier.slug}
              userEmail={currentUser?.email}
              bookings={bookings}
              isOwner={isOwner}
            />
          </div>
        </aside>
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
