"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, PackagePlus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  archiveSupplierPackageAction,
  upsertSupplierPackageAction,
} from "../application/actions";
import type {
  SupplierMarketplaceProfile,
  SupplierPackage,
} from "../types/supplier.types";
import { formatPriceUnit, formatSupplierPrice } from "../utils/supplier-format";

const packageFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Package name is required").max(120),
  description: z.string().trim().max(900).optional(),
  price: z.string().optional(),
  priceUnit: z.enum(["per_event", "per_hour", "per_pax", "per_day"]),
  packageType: z.string().trim().min(2).max(60),
  inclusionsText: z.string().optional(),
  minGuests: z.string().optional(),
  maxGuests: z.string().optional(),
  sortOrder: z.string().optional(),
  isActive: z.boolean(),
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

function numberOrUndefined(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitList(value?: string) {
  return (value ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFormValues(pkg?: SupplierPackage): PackageFormValues {
  return {
    id: pkg?.id ?? "",
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    price: pkg?.price ? String(pkg.price) : "",
    priceUnit: pkg?.priceUnit ?? "per_event",
    packageType: pkg?.packageType ?? "standard",
    inclusionsText: pkg?.inclusions.join("\n") ?? "",
    minGuests: pkg?.minGuests ? String(pkg.minGuests) : "",
    maxGuests: pkg?.maxGuests ? String(pkg.maxGuests) : "",
    sortOrder: String(pkg?.sortOrder ?? 0),
    isActive: pkg?.isActive ?? true,
  };
}

export function SupplierPackageManager({
  profile,
}: {
  profile: SupplierMarketplaceProfile;
}) {
  const router = useRouter();
  const [editingPackage, setEditingPackage] = useState<SupplierPackage | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: toFormValues(),
  });

  const startEdit = (pkg: SupplierPackage) => {
    setEditingPackage(pkg);
    reset(toFormValues(pkg));
  };

  const resetForm = () => {
    setEditingPackage(null);
    reset(toFormValues());
  };

  const onSubmit = (values: PackageFormValues) => {
    startTransition(async () => {
      const result = await upsertSupplierPackageAction({
        id: values.id || undefined,
        supplierId: profile.id,
        name: values.name,
        description: values.description,
        price: numberOrUndefined(values.price),
        priceUnit: values.priceUnit,
        packageType: values.packageType,
        inclusions: splitList(values.inclusionsText),
        minGuests: numberOrUndefined(values.minGuests),
        maxGuests: numberOrUndefined(values.maxGuests),
        isActive: values.isActive,
        sortOrder: numberOrUndefined(values.sortOrder) ?? 0,
      });

      if (result.error) {
        setFormMessage(result.error.message);
        return;
      }

      setFormMessage("Package saved.");
      resetForm();
      router.refresh();
    });
  };

  const archivePackage = (packageId: string) => {
    startTransition(async () => {
      const result = await archiveSupplierPackageAction({ id: packageId });
      if (result.error) {
        setFormMessage(result.error.message);
        return;
      }
      setFormMessage("Package archived.");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="self-start rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-5 flex items-center gap-2">
          <PackagePlus className="h-5 w-5 text-[#2563EB]" />
          <h2 className="text-lg font-black text-slate-950">
            {editingPackage ? "Edit package" : "Add package"}
          </h2>
        </div>

        <div className="grid gap-5">
          <input type="hidden" {...register("id")} />
          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">Package Name</span>
            <input
              {...register("name")}
              placeholder="e.g., Premium Photography Package"
              className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
            />
            {errors.name?.message ? (
              <p className="text-xs font-semibold text-red-600">{errors.name.message}</p>
            ) : null}
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">Description</span>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Briefly describe what this package includes..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Price (Optional)</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₱</span>
                <input
                  {...register("price")}
                  type="number"
                  min="0"
                  placeholder="0.00"
                  className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />
              </div>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Pricing Unit</span>
              <select
                {...register("priceUnit")}
                className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              >
                <option value="per_event">Per event</option>
                <option value="per_hour">Per hour</option>
                <option value="per_pax">Per pax</option>
                <option value="per_day">Per day</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Package Type</span>
              <input
                {...register("packageType")}
                placeholder="e.g., standard, premium"
                className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Display Order</span>
              <input
                {...register("sortOrder")}
                type="number"
                min="0"
                placeholder="0"
                className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Minimum Guests</span>
              <input
                {...register("minGuests")}
                type="number"
                min="1"
                placeholder="1"
                className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Maximum Guests</span>
              <input
                {...register("maxGuests")}
                type="number"
                min="1"
                placeholder="No limit"
                className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">Inclusions (one per line)</span>
            <textarea
              {...register("inclusionsText")}
              rows={4}
              placeholder="4 hours of coverage&#10;High-res edited photos&#10;Online gallery"
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold outline-none transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              {...register("isActive")}
              className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
            />
            Make this package active
          </label>
        </div>

        {formMessage ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            {formMessage}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
          {editingPackage ? (
            <button
              type="button"
              onClick={resetForm}
              className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-600 transition hover:border-[#2563EB] hover:text-[#1D4ED8]"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-black text-white transition hover:bg-[#1D4ED8] disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save package"}
          </button>
        </div>
      </form>

      <div className="grid gap-4">
        {profile.packages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
            No packages yet.
          </div>
        ) : (
          profile.packages.map((pkg) => (
            <article
              key={pkg.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-[#1D4ED8]">
                    {pkg.packageType.replace(/_/g, " ")}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    {pkg.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {pkg.isActive ? "Active" : "Archived"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl font-black text-slate-950">
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
              {pkg.inclusions.length > 0 ? (
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  {pkg.inclusions.slice(0, 5).join(", ")}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(pkg)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-slate-600 transition hover:border-[#2563EB] hover:text-[#1D4ED8]"
                >
                  Edit
                </button>
                {pkg.isActive ? (
                  <button
                    type="button"
                    onClick={() => archivePackage(pkg.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-red-700 transition hover:bg-red-100"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
