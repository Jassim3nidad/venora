"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { upsertSupplierProfileAction } from "../application/actions";
import type {
  SupplierCategory,
  SupplierMarketplaceProfile,
} from "../types/supplier.types";

const profileFormSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required").max(120),
  categoryId: z.string().optional(),
  headline: z.string().trim().max(160).optional(),
  description: z.string().trim().max(1800).optional(),
  basePrice: z.string().optional(),
  priceUnit: z.enum(["per_event", "per_hour", "per_pax", "per_day"]),
  serviceAreasText: z.string().trim().min(2, "Add at least one service area"),
  coverageRadiusKm: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  websiteUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  profileImageUrl: z.string().optional(),
  heroImageUrl: z.string().optional(),
  responseTimeHours: z.string().optional(),
  yearsInBusiness: z.string().optional(),
  teamSize: z.string().optional(),
  minimumBookingNoticeDays: z.string().optional(),
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
  return <p className="text-xs font-semibold text-red-600">{message}</p>;
}

export function SupplierProfileForm({
  profile,
  categories,
}: SupplierProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      businessName: profile?.businessName ?? "",
      categoryId: profile?.category?.id ?? "",
      headline: profile?.headline ?? "",
      description: profile?.description ?? "",
      basePrice: profile?.basePrice ? String(profile.basePrice) : "",
      priceUnit: profile?.priceUnit ?? "per_event",
      serviceAreasText: profile?.serviceAreas.join("\n") ?? "",
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
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
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
      });

      if (result.error) {
        setError("businessName", { message: result.error.message });
        setFormMessage(null);
        return;
      }

      setFormMessage("Profile saved.");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-slate-700">Business name</span>
          <input
            {...register("businessName")}
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
          <FieldError message={errors.businessName?.message} />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-slate-700">Category</span>
          <select
            {...register("categoryId")}
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
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
        <span className="text-sm font-bold text-slate-700">Headline</span>
        <input
          {...register("headline")}
          className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-bold text-slate-700">Description</span>
        <textarea
          {...register("description")}
          rows={5}
          className="resize-none rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
        />
      </label>

      <div className="grid gap-5 md:grid-cols-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-slate-700">Base price</span>
          <input
            {...register("basePrice")}
            type="number"
            min="0"
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-slate-700">Price unit</span>
          <select
            {...register("priceUnit")}
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          >
            <option value="per_event">Per event</option>
            <option value="per_hour">Per hour</option>
            <option value="per_pax">Per pax</option>
            <option value="per_day">Per day</option>
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-slate-700">Response hours</span>
          <input
            {...register("responseTimeHours")}
            type="number"
            min="0"
            max="168"
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-slate-700">Service areas</span>
          <textarea
            {...register("serviceAreasText")}
            rows={4}
            placeholder="Metro Manila&#10;Tagaytay&#10;Cavite"
            className="resize-none rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
          <FieldError message={errors.serviceAreasText?.message} />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">Coverage km</span>
            <input
              {...register("coverageRadiusKm")}
              type="number"
              min="0"
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">Lead days</span>
            <input
              {...register("minimumBookingNoticeDays")}
              type="number"
              min="0"
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">Years</span>
            <input
              {...register("yearsInBusiness")}
              type="number"
              min="0"
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">Team size</span>
            <input
              {...register("teamSize")}
              type="number"
              min="1"
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {[
          ["contactEmail", "Contact email", "email"],
          ["contactPhone", "Contact phone", "tel"],
          ["websiteUrl", "Website URL", "url"],
          ["instagramUrl", "Instagram URL", "url"],
          ["profileImageUrl", "Profile image URL", "url"],
          ["heroImageUrl", "Hero image URL", "url"],
        ].map(([name, label, type]) => (
          <label key={name} className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">{label}</span>
            <input
              {...register(name as keyof ProfileFormValues)}
              type={type}
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </label>
        ))}
      </div>

      {formMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {formMessage}
        </p>
      ) : null}

      <div className="flex justify-end border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-black text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Saving..." : "Save profile"}
        </button>
      </div>
    </form>
  );
}
