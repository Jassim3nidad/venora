"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Controller } from "react-hook-form";
import type {
  SupplierMarketplaceProfile,
  SupplierPortfolioItem,
} from "../types/supplier.types";
import { upsertSupplierPortfolioAction } from "../application/actions";
import { PortfolioImageUploader } from "./PortfolioImageUploader";

const portfolioBuilderSchema = z.object({
  title: z.string().trim().optional(),
  description: z.string().trim().max(1000).optional(),
  imageUrls: z.array(z.string()).default([]),
  imageUrl: z.string().nullable().optional(), // Cover image
  eventType: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
  venueName: z.string().trim().max(100).optional(),
  eventDate: z.string().optional(),
  isFeatured: z.boolean().default(false),
  status: z.enum(["draft", "published", "hidden"]).default("draft"),
  serviceId: z.string().nullable().optional(),
});

type PortfolioBuilderValues = z.infer<typeof portfolioBuilderSchema>;

export function SupplierPortfolioBuilder({
  profile,
  existingProject,
}: {
  profile: SupplierMarketplaceProfile;
  existingProject?: SupplierPortfolioItem;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<PortfolioBuilderValues>({
    resolver: zodResolver(portfolioBuilderSchema),
    defaultValues: {
      title: existingProject?.title ?? "",
      description: existingProject?.description ?? "",
      imageUrls: existingProject?.imageUrls ?? [],
      imageUrl: existingProject?.imageUrl ?? null,
      eventType: existingProject?.eventType ?? "",
      city: existingProject?.city ?? "",
      province: existingProject?.province ?? "",
      venueName: existingProject?.venueName ?? "",
      eventDate: existingProject?.eventDate ?? "",
      isFeatured: existingProject?.isFeatured ?? false,
      status: existingProject?.status ?? "draft",
      serviceId: existingProject?.serviceId ?? null,
    },
  });

  const onSubmit = async (
    values: PortfolioBuilderValues,
    finalStatus?: "draft" | "published" | "hidden",
  ) => {
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          id: existingProject?.id,
          status: finalStatus ?? values.status,
          imageUrl:
            values.imageUrl ??
            (values.imageUrls.length > 0 ? values.imageUrls[0] : ""),
        };

        // Validation check for published state
        if (
          payload.status === "published" &&
          (!payload.title || payload.imageUrls.length === 0)
        ) {
          setError("A title and at least one image are required to publish.");
          return;
        }

        const response = await upsertSupplierPortfolioAction(payload);

        if (response?.error) {
          setError(response.error.message);
          return;
        }

        if (payload.status === "published") {
          router.push("/dashboard/supplier/portfolio?published=true");
        } else {
          router.push("/dashboard/supplier/portfolio?saved=true");
        }
      } catch (err: any) {
        setError(err.message || "Failed to save portfolio project");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(v))}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_440px] items-start"
    >
      <div className="grid gap-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
            {error}
          </div>
        )}
        {/* Editor columns */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-800">
              Project Photos
            </h2>
            <p className="text-sm text-slate-500">
              Upload up to 12 photos. The first image will be used as the cover.
              Drag and drop to reorder.
            </p>
          </div>

          <Controller
            control={control}
            name="imageUrls"
            render={({ field: { value, onChange } }) => (
              <PortfolioImageUploader
                imageUrls={value}
                coverImageUrl={watch("imageUrl") ?? null}
                onChangeImageUrls={onChange}
                onChangeCoverImageUrl={(url) =>
                  setValue("imageUrl", url ?? "", { shouldDirty: true })
                }
                maxImages={12}
              />
            )}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-800">
              Project Details
            </h2>
            <p className="text-sm text-slate-500">
              Provide the story and context behind this project.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Project Title
              </label>
              <input
                {...register("title")}
                type="text"
                placeholder="e.g. Garden Wedding at The Manor"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Project Story
              </label>
              <textarea
                {...register("description")}
                placeholder="Describe the project, your role, and what made it special..."
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Related Service
              </label>
              <select
                {...register("serviceId")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              >
                <option value="">None / General</option>
                {profile.packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-800">
              Event Information
            </h2>
            <p className="text-sm text-slate-500">
              Help customers find you based on location or event type.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Event Type
              </label>
              <input
                {...register("eventType")}
                type="text"
                placeholder="e.g. Wedding, Corporate"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Event Date
              </label>
              <input
                {...register("eventDate")}
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Venue Name
              </label>
              <input
                {...register("venueName")}
                type="text"
                placeholder="e.g. The Glasshouse"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                City
              </label>
              <input
                {...register("city")}
                type="text"
                placeholder="e.g. Tagaytay"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Province / Region
              </label>
              <input
                {...register("province")}
                type="text"
                placeholder="e.g. Cavite"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-800">
              Display Settings
            </h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Project Visibility
              </label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <input
                    type="radio"
                    value="published"
                    {...register("status")}
                    className="mt-1 h-4 w-4 border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Published
                    </div>
                    <div className="text-xs text-slate-500">
                      Visible to all customers on your marketplace profile
                    </div>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <input
                    type="radio"
                    value="draft"
                    {...register("status")}
                    className="mt-1 h-4 w-4 border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Draft
                    </div>
                    <div className="text-xs text-slate-500">
                      Only visible to you while you work on it
                    </div>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <input
                    type="radio"
                    value="hidden"
                    {...register("status")}
                    className="mt-1 h-4 w-4 border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Hidden
                    </div>
                    <div className="text-xs text-slate-500">
                      Temporarily hidden from your profile
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register("isFeatured")}
                className="h-5 w-5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  Feature this project
                </div>
                <div className="text-xs text-slate-500">
                  Featured projects appear at the top of your portfolio
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/supplier/portfolio")}
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit((v) => onSubmit(v, "draft"))}
            disabled={isPending}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[#2563EB] px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save & Publish"}
          </button>
        </div>
      </div>

      <div className="sticky top-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-800">Live Preview</h2>
            <p className="text-xs text-slate-500 mt-1">
              This is how your project will appear on your public profile.
            </p>
          </div>

          <div className="p-5">
            <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition duration-300 hover:shadow-md">
              <div className="aspect-[4/3] overflow-hidden bg-slate-100 relative">
                {watch("imageUrl") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={watch("imageUrl") || undefined}
                    alt={watch("title") || "Portfolio preview"}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <span className="text-sm">No cover photo selected</span>
                  </div>
                )}
                {watch("imageUrls").length > 1 && (
                  <div className="absolute bottom-3 right-3 rounded-md bg-black/50 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    +{watch("imageUrls").length - 1} photos
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="line-clamp-1 font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors">
                      {watch("title") || "Project Title"}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                      {watch("eventType") && (
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                          {watch("eventType")}
                        </div>
                      )}
                      {(watch("city") || watch("province")) && (
                        <div>
                          {[watch("city"), watch("province")]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {watch("description") && (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                    {watch("description")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
