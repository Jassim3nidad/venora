"use client";

import { useState, useTransition, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  MapPin,
  Building2,
  Phone,
  Mail,
  Globe,
  Instagram,
  Clock,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { upsertSupplierProfileAction } from "../application/actions";
import type {
  SupplierCategory,
  SupplierMarketplaceProfile,
} from "../types/supplier.types";
import { SupplierImageUpload } from "./SupplierImageUpload";
import { Toast, ToastDescription, ToastTitle } from "@venora/ui";
import dynamic from "next/dynamic";
const SupplierLocationPicker = dynamic(
  () => import("./SupplierLocationPicker"),
  { ssr: false },
);

const profileFormSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required").max(120),
  categoryId: z.string().optional(),
  headline: z.string().trim().max(160).optional(),
  description: z.string().trim().max(1800).optional(),
  basePrice: z.string().optional(),
  priceUnit: z.enum(["per_event", "per_hour", "per_pax", "per_day"]),
  serviceAreasText: z.string().trim().min(2, "Add at least one service area"),
  coverageRadiusKm: z.string().optional(),
  contactEmail: z
    .string()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().optional(),
  websiteUrl: z
    .string()
    .url("Enter a valid URL (e.g., https://example.com)")
    .optional()
    .or(z.literal("")),
  instagramUrl: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  profileImageUrl: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  heroImageUrl: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  responseTimeHours: z.string().optional(),
  yearsInBusiness: z.string().optional(),
  teamSize: z.string().optional(),
  minimumBookingNoticeDays: z.string().optional(),
  businessLocationType: z
    .enum(["mobile", "home_based", "studio", "storefront"])
    .default("mobile"),
  locationVisibility: z
    .enum(["exact", "approximate", "service_area_only"])
    .default("exact"),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  city: z.string().trim().max(120).optional(),
  province: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  businessAddress: z.string().trim().max(250).optional(),
  publicLocationLabel: z.string().trim().max(120).optional(),
  travelAvailable: z.boolean().default(false),
  travelFeeNote: z.string().trim().max(500).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

type SupplierProfileFormProps = {
  profile: SupplierMarketplaceProfile | null;
  categories: SupplierCategory[];
};

function numberOrUndefined(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}

// Section Card Component
function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="grid gap-6">{children}</div>
    </div>
  );
}

// Helper to format currency
const formatCurrency = (amount: number | string | undefined) => {
  if (!amount || isNaN(Number(amount))) return "0";
  return Number(amount).toLocaleString();
};

export function SupplierProfileForm({
  profile,
  categories,
}: SupplierProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Toast state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    title: "",
    description: "",
  });

  const defaultValues: ProfileFormValues = {
    businessName: profile?.businessName ?? "",
    categoryId: profile?.category?.id ?? "",
    headline: profile?.headline ?? "",
    description: profile?.description ?? "",
    basePrice: profile?.basePrice ? String(profile.basePrice) : "",
    priceUnit: profile?.priceUnit ?? "per_event",
    serviceAreasText: profile?.serviceAreas.join(", ") ?? "",
    coverageRadiusKm: profile?.coverageRadiusKm
      ? String(profile.coverageRadiusKm)
      : "",
    contactEmail: profile?.contactEmail ?? "",
    contactPhone: profile?.contactPhone ?? "",
    websiteUrl: profile?.websiteUrl ?? "",
    instagramUrl: profile?.instagramUrl ?? "",
    profileImageUrl: profile?.profileImageUrl ?? "",
    heroImageUrl: profile?.heroImageUrl ?? "",
    responseTimeHours: String(profile?.responseTimeHours ?? 24),
    yearsInBusiness: profile?.yearsInBusiness
      ? String(profile.yearsInBusiness)
      : "",
    teamSize: profile?.teamSize ? String(profile.teamSize) : "",
    minimumBookingNoticeDays: String(profile?.minimumBookingNoticeDays ?? 14),
    businessLocationType: profile?.businessLocationType ?? "mobile",
    locationVisibility: profile?.locationVisibility ?? "exact",
    latitude: profile?.latitude ?? null,
    longitude: profile?.longitude ?? null,
    city: profile?.city ?? "",
    province: profile?.province ?? "",
    country: profile?.country ?? "",
    businessAddress: profile?.businessAddress ?? "",
    publicLocationLabel: profile?.publicLocationLabel ?? "",
    travelAvailable: profile?.travelAvailable ?? false,
    travelFeeNote: profile?.travelFeeNote ?? "",
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    setError,
    watch,
    reset,
    setValue,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  });

  const formValues = watch();

  // Completion calculation
  const completionItems = [
    { name: "Business Name", filled: !!formValues.businessName?.trim() },
    { name: "Category", filled: !!formValues.categoryId },
    { name: "Business Tagline", filled: !!formValues.headline?.trim() },
    { name: "Business Description", filled: !!formValues.description?.trim() },
    { name: "Starting Price", filled: !!formValues.basePrice?.trim() },
    { name: "Service Areas", filled: !!formValues.serviceAreasText?.trim() },
    { name: "Contact Phone", filled: !!formValues.contactPhone?.trim() },
    { name: "Contact Email", filled: !!formValues.contactEmail?.trim() },
    { name: "Profile Image", filled: !!formValues.profileImageUrl?.trim() },
    { name: "Cover Image", filled: !!formValues.heroImageUrl?.trim() },
  ];

  const filledItems = completionItems.filter((i) => i.filled).length;
  const completionPercentage = Math.round(
    (filledItems / completionItems.length) * 100,
  );
  const missingItems = completionItems.filter((i) => !i.filled);

  const onSubmit = (values: ProfileFormValues) => {
    setFormMessage(null);
    startTransition(async () => {
      const result = await upsertSupplierProfileAction({
        businessName: values.businessName,
        categoryId: values.categoryId || undefined,
        headline: values.headline,
        description: values.description,
        basePrice: numberOrUndefined(values.basePrice),
        priceUnit: values.priceUnit,
        serviceAreas: splitList(values.serviceAreasText),
        coverageRadiusKm: numberOrUndefined(values.coverageRadiusKm),
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        websiteUrl: values.websiteUrl,
        instagramUrl: values.instagramUrl,
        profileImageUrl: values.profileImageUrl,
        heroImageUrl: values.heroImageUrl,
        responseTimeHours: numberOrUndefined(values.responseTimeHours) ?? 24,
        yearsInBusiness: numberOrUndefined(values.yearsInBusiness),
        teamSize: numberOrUndefined(values.teamSize),
        minimumBookingNoticeDays:
          numberOrUndefined(values.minimumBookingNoticeDays) ?? 14,
        businessLocationType: values.businessLocationType,
        locationVisibility: values.locationVisibility,
        latitude: values.latitude,
        longitude: values.longitude,
        city: values.city,
        province: values.province,
        country: values.country,
        businessAddress: values.businessAddress,
        publicLocationLabel: values.publicLocationLabel,
        travelAvailable: values.travelAvailable,
        travelFeeNote: values.travelFeeNote,
      });

      if (result.error) {
        setFormMessage({ type: "error", text: result.error.message });
        setToastMessage({ title: "Error", description: result.error.message });
        setToastOpen(true);
        return;
      }

      setFormMessage({ type: "success", text: "Profile successfully saved." });
      setToastMessage({
        title: "Success",
        description: "Profile successfully saved.",
      });
      setToastOpen(true);
      reset(values); // Reset isDirty state
      router.refresh();

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setFormMessage(null);
      }, 3000);
    });
  };

  const getPriceUnitLabel = (unit: string) => {
    switch (unit) {
      case "per_event":
        return "per event";
      case "per_hour":
        return "per hour";
      case "per_pax":
        return "per pax";
      case "per_day":
        return "per day";
      default:
        return unit;
    }
  };

  const categoryName =
    categories.find((c) => c.id === formValues.categoryId)?.name || "Category";

  // Prevent accidental navigation when form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="relative pb-24">
      {/* Top Banner: Completion Status */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Profile Completion</h3>
            <span className="font-black text-[#2563EB]">
              {completionPercentage}%
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-[#2563EB] transition-all duration-500 ease-in-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
        {missingItems.length > 0 && (
          <div className="px-6 py-4">
            <p className="text-sm font-semibold text-slate-600 mb-2">
              Complete your profile to improve visibility. Still needed:
            </p>
            <ul className="grid gap-1 sm:grid-cols-2 md:grid-cols-3">
              {missingItems.slice(0, 6).map((item, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-500 flex items-center gap-1.5"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  {item.name}
                </li>
              ))}
              {missingItems.length > 6 && (
                <li className="text-xs text-slate-400 italic">
                  ...and {missingItems.length - 6} more
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Main Form Left Column */}
        <div className="flex-1 w-full min-w-0">
          <form
            id="profile-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <SectionCard
              title="Business Identity"
              description="This information appears prominently on your public supplier listing."
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Business Name
                  </span>
                  <input
                    {...register("businessName")}
                    placeholder="Your Business Name"
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                  <FieldError message={errors.businessName?.message} />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Category
                  </span>
                  <select
                    {...register("categoryId")}
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  >
                    <option value="">Choose category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-700">
                    Business Tagline
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {formValues.headline?.length || 0}/160
                  </span>
                </div>
                <input
                  {...register("headline")}
                  placeholder="e.g., Custom cakes and dessert tables for weddings and celebrations."
                  className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />
                <p className="text-xs text-slate-500">
                  A short sentence customers will see below your business name.
                </p>
                <FieldError message={errors.headline?.message} />
              </label>

              <label className="grid gap-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-700">
                    Business Description
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {formValues.description?.length || 0}/1800
                  </span>
                </div>
                <textarea
                  {...register("description")}
                  rows={6}
                  placeholder="What services do you specialize in? What types of events do you serve? What makes your business unique?"
                  className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />
                <p className="text-xs text-slate-500">
                  Explain what you offer and what makes your business different.
                </p>
                <FieldError message={errors.description?.message} />
              </label>
            </SectionCard>

            <SectionCard
              title="Pricing and Operations"
              description="Help customers understand your starting price and booking requirements."
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Starting Price
                  </span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      ₱
                    </span>
                    <input
                      {...register("basePrice")}
                      type="number"
                      min="0"
                      placeholder="0.00"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                  </div>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Pricing Basis
                  </span>
                  <select
                    {...register("priceUnit")}
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  >
                    <option value="per_event">Per event</option>
                    <option value="per_hour">Per hour</option>
                    <option value="per_pax">Per guest (pax)</option>
                    <option value="per_day">Per day</option>
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Typical Response Time
                  </span>
                  <div className="relative">
                    <input
                      {...register("responseTimeHours")}
                      type="number"
                      min="0"
                      max="168"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 pr-16 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                      hours
                    </span>
                  </div>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Minimum Booking Notice
                  </span>
                  <div className="relative">
                    <input
                      {...register("minimumBookingNoticeDays")}
                      type="number"
                      min="0"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 pr-14 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                      days
                    </span>
                  </div>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Years in Business
                  </span>
                  <div className="relative">
                    <input
                      {...register("yearsInBusiness")}
                      type="number"
                      min="0"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 pr-14 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                      years
                    </span>
                  </div>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Team Size
                  </span>
                  <div className="relative">
                    <input
                      {...register("teamSize")}
                      type="number"
                      min="1"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 pr-16 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                      people
                    </span>
                  </div>
                </label>
              </div>
            </SectionCard>

            <SectionCard
              title="Service Location and Coverage"
              description="Configure your business location and control how it appears to customers."
            >
              <div className="grid gap-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-bold text-slate-700">
                      Business Location Type
                    </span>
                    <select
                      {...register("businessLocationType")}
                      className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    >
                      <option value="mobile">Mobile / We come to you</option>
                      <option value="home_based">Home-based Business</option>
                      <option value="studio">Private Studio</option>
                      <option value="storefront">Retail Storefront</option>
                    </select>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-sm font-bold text-slate-700">
                      Location Visibility on Profile
                    </span>
                    <select
                      {...register("locationVisibility")}
                      className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    >
                      <option value="exact">Show exact map pin</option>
                      <option value="approximate">
                        Show approximate map area
                      </option>
                      <option value="service_area_only">
                        Hide map (Service areas only)
                      </option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="grid gap-1.5 sm:col-span-2">
                    <span className="text-sm font-bold text-slate-700">
                      Business Address
                    </span>
                    <input
                      {...register("businessAddress")}
                      type="text"
                      placeholder="e.g., 123 Event Street, Makati City"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-sm font-bold text-slate-700">
                      City
                    </span>
                    <input
                      {...register("city")}
                      type="text"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-sm font-bold text-slate-700">
                      Province
                    </span>
                    <input
                      {...register("province")}
                      type="text"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                  </label>
                </div>

                <SupplierLocationPicker
                  initialLatitude={formValues.latitude ?? null}
                  initialLongitude={formValues.longitude ?? null}
                  radiusKm={
                    numberOrUndefined(formValues.coverageRadiusKm) ?? null
                  }
                  onLocationChange={(lat, lng) => {
                    setValue("latitude", lat, { shouldDirty: true });
                    setValue("longitude", lng, { shouldDirty: true });
                  }}
                />

                <div className="grid gap-6 sm:grid-cols-2 pt-4 border-t border-slate-100">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-bold text-slate-700">
                      Service Areas
                    </span>
                    <textarea
                      {...register("serviceAreasText")}
                      rows={3}
                      placeholder="e.g., Metro Manila, Tagaytay, Cavite"
                      className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                    <p className="text-xs text-slate-500">
                      Enter service areas separated by commas or new lines.
                    </p>
                    <FieldError message={errors.serviceAreasText?.message} />
                  </label>

                  <div className="grid gap-4">
                    <label className="grid gap-1.5">
                      <span className="text-sm font-bold text-slate-700">
                        Coverage Distance / Radius
                      </span>
                      <div className="relative">
                        <input
                          {...register("coverageRadiusKm")}
                          type="number"
                          min="0"
                          className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 pr-12 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                          km
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 mt-2">
                      <input
                        {...register("travelAvailable")}
                        type="checkbox"
                        className="h-5 w-5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <span className="text-sm font-bold text-slate-700">
                        Available to travel to event location
                      </span>
                    </label>
                  </div>
                </div>

                {formValues.travelAvailable && (
                  <label className="grid gap-1.5">
                    <span className="text-sm font-bold text-slate-700">
                      Travel Fee Note
                    </span>
                    <textarea
                      {...register("travelFeeNote")}
                      rows={2}
                      placeholder="e.g., Free travel within 20km. PHP 1,000 flat fee for out of town."
                      className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                    />
                  </label>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Contact and Social Presence"
              description="Provide the contact information customers may use for business inquiries."
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Contact Email
                  </span>
                  <input
                    {...register("contactEmail")}
                    type="email"
                    placeholder="hello@yourbusiness.com"
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                  <FieldError message={errors.contactEmail?.message} />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Contact Phone
                  </span>
                  <input
                    {...register("contactPhone")}
                    type="tel"
                    placeholder="+63 917 123 4567"
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Website URL
                  </span>
                  <input
                    {...register("websiteUrl")}
                    type="url"
                    placeholder="https://yourbusiness.com"
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                  <FieldError message={errors.websiteUrl?.message} />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-slate-700">
                    Instagram URL
                  </span>
                  <input
                    {...register("instagramUrl")}
                    type="url"
                    placeholder="https://instagram.com/yourbusiness"
                    className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                  <FieldError message={errors.instagramUrl?.message} />
                </label>
              </div>
            </SectionCard>

            <SectionCard
              title="Images and Branding"
              description="Use high-quality images to help customers recognize and trust your business."
            >
              <div className="grid gap-8">
                {/* Profile Image URL */}
                <div className="grid gap-4 sm:grid-cols-[1fr,120px] items-start">
                  <div className="grid gap-1.5">
                    <label className="grid gap-1.5">
                      <span className="text-sm font-bold text-slate-700">
                        Business Logo or Profile Image URL
                      </span>
                      <input
                        {...register("profileImageUrl")}
                        type="url"
                        placeholder="https://example.com/logo.jpg"
                        className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                      />
                    </label>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500">
                        Provide a direct link or upload an image.
                      </p>
                      <SupplierImageUpload
                        onUploadSuccess={(url) =>
                          setValue("profileImageUrl", url, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        label="Upload file"
                        aspectRatio={1}
                      />
                    </div>
                    <FieldError message={errors.profileImageUrl?.message} />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-24 w-24 sm:h-[120px] sm:w-[120px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                      {formValues.profileImageUrl ? (
                        <img
                          src={formValues.profileImageUrl}
                          alt="Profile Preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "";
                            e.currentTarget.className = "hidden";
                          }}
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-slate-300" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                {/* Hero Image URL */}
                <div className="grid gap-4 items-start">
                  <div className="grid gap-1.5">
                    <label className="grid gap-1.5">
                      <span className="text-sm font-bold text-slate-700">
                        Cover Photo URL
                      </span>
                      <input
                        {...register("heroImageUrl")}
                        type="url"
                        placeholder="https://example.com/cover.jpg"
                        className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                      />
                    </label>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500">
                        Use a high-quality image that represents your services
                        (Recommended: 1600 × 900 px).
                      </p>
                      <SupplierImageUpload
                        onUploadSuccess={(url) =>
                          setValue("heroImageUrl", url, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        label="Upload file"
                        aspectRatio={16 / 9}
                      />
                    </div>
                    <FieldError message={errors.heroImageUrl?.message} />
                  </div>

                  <div className="w-full aspect-[21/9] sm:aspect-[16/9] lg:aspect-[21/9] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                    {formValues.heroImageUrl ? (
                      <img
                        src={formValues.heroImageUrl}
                        alt="Hero Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "";
                          e.currentTarget.className = "hidden";
                        }}
                      />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-slate-300" />
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>
          </form>
        </div>

        {/* Sticky Live Preview Right Column */}
        <div className="hidden xl:block w-80 2xl:w-[360px] shrink-0">
          <div className="sticky top-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
              Live Profile Preview
            </h3>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col pointer-events-none">
              {/* Cover Image */}
              <div className="relative h-32 w-full bg-slate-100 border-b border-slate-100">
                {formValues.heroImageUrl ? (
                  <img
                    src={formValues.heroImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>

              {/* Profile Body */}
              <div className="relative p-5 pt-0 flex-1 flex flex-col">
                {/* Logo */}
                <div className="absolute -top-10 left-5 h-20 w-20 rounded-xl border-4 border-white bg-slate-100 shadow-sm overflow-hidden flex items-center justify-center">
                  {formValues.profileImageUrl ? (
                    <img
                      src={formValues.profileImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-slate-300" />
                  )}
                </div>

                <div className="mt-12 space-y-1">
                  <h4 className="font-bold text-lg text-slate-900 leading-tight">
                    {formValues.businessName || "Your Business Name"}
                  </h4>
                  <p className="text-sm text-slate-500 font-medium">
                    {categoryName}
                  </p>
                </div>

                {formValues.headline && (
                  <p className="mt-3 text-sm text-slate-700 leading-snug">
                    "{formValues.headline}"
                  </p>
                )}

                <div className="mt-5 space-y-2.5">
                  {formValues.basePrice && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 font-bold text-xs">
                        ₱
                      </div>
                      <span className="font-semibold text-slate-900">
                        Starts at ₱{formatCurrency(formValues.basePrice)}
                      </span>
                      <span className="text-slate-500">
                        {" "}
                        {getPriceUnitLabel(formValues.priceUnit)}
                      </span>
                    </div>
                  )}

                  {formValues.serviceAreasText && (
                    <div className="flex gap-2 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                      <span className="line-clamp-2">
                        {formValues.serviceAreasText}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                  {formValues.yearsInBusiness && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />{" "}
                      {formValues.yearsInBusiness} yrs exp
                    </div>
                  )}
                  {formValues.teamSize && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Team of{" "}
                      {formValues.teamSize}
                    </div>
                  )}
                </div>
              </div>

              {/* View Profile Button */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 pointer-events-auto">
                {profile?.slug ? (
                  <Link
                    href={`/suppliers/${profile.slug}`}
                    target="_blank"
                    className="w-full h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  >
                    View Full Profile
                  </Link>
                ) : (
                  <div className="w-full h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-400 shadow-sm cursor-not-allowed">
                    Save profile to preview
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">
              Customers will see this card when searching the marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-in-out ${isDirty || formMessage ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-4 py-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {formMessage?.type === "success" ? (
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                  <CheckCircle2 className="h-5 w-5" />
                  {formMessage.text}
                </div>
              ) : formMessage?.type === "error" ? (
                <div className="flex items-center gap-2 text-red-600 font-bold">
                  <AlertCircle className="h-5 w-5" />
                  {formMessage.text}
                </div>
              ) : isDirty ? (
                <div className="flex items-center gap-2 text-amber-600 font-bold">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  You have unsaved changes
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {isDirty && !isPending && (
                <button
                  type="button"
                  onClick={() => reset()}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Discard
                </button>
              )}
              <button
                type="submit"
                form="profile-form"
                disabled={!isDirty || isPending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 text-sm font-black text-white transition hover:bg-[#1D4ED8] disabled:bg-slate-300 disabled:cursor-not-allowed min-w-[140px]"
              >
                {isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Toast component */}
      {toastOpen && (
        <Toast onOpenChange={setToastOpen}>
          <div className="flex flex-col gap-1">
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </div>
        </Toast>
      )}
    </div>
  );
}
