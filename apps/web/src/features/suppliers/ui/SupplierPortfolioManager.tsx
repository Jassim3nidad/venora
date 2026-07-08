"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { upsertSupplierPortfolioAction } from "../application/actions";
import type {
  SupplierMarketplaceProfile,
  SupplierPortfolioItem,
} from "../types/supplier.types";

const portfolioFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Title is required").max(120),
  description: z.string().trim().max(600).optional(),
  imageUrl: z.string().trim().url("Enter a valid image URL"),
  eventType: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
  eventDate: z.string().optional(),
  isFeatured: z.boolean(),
  sortOrder: z.string().optional(),
});

type PortfolioFormValues = z.infer<typeof portfolioFormSchema>;

function numberOrZero(value?: string) {
  if (!value?.trim()) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toFormValues(item?: SupplierPortfolioItem): PortfolioFormValues {
  return {
    id: item?.id ?? "",
    title: item?.title ?? "",
    description: item?.description ?? "",
    imageUrl: item?.imageUrl ?? "",
    eventType: item?.eventType ?? "",
    city: item?.city ?? "",
    province: item?.province ?? "",
    eventDate: item?.eventDate ?? "",
    isFeatured: item?.isFeatured ?? false,
    sortOrder: String(item?.sortOrder ?? 0),
  };
}

export function SupplierPortfolioManager({
  profile,
}: {
  profile: SupplierMarketplaceProfile;
}) {
  const router = useRouter();
  const [editingItem, setEditingItem] = useState<SupplierPortfolioItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: toFormValues(),
  });

  const startEdit = (item: SupplierPortfolioItem) => {
    setEditingItem(item);
    reset(toFormValues(item));
  };

  const resetForm = () => {
    setEditingItem(null);
    reset(toFormValues());
  };

  const onSubmit = (values: PortfolioFormValues) => {
    startTransition(async () => {
      const result = await upsertSupplierPortfolioAction({
        id: values.id || undefined,
        supplierId: profile.id,
        title: values.title,
        description: values.description,
        imageUrl: values.imageUrl,
        eventType: values.eventType,
        city: values.city,
        province: values.province,
        eventDate: values.eventDate,
        isFeatured: values.isFeatured,
        sortOrder: numberOrZero(values.sortOrder),
      });

      if (result.error) {
        setFormMessage(result.error.message);
        return;
      }

      setFormMessage("Portfolio item saved.");
      resetForm();
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
          <ImagePlus className="h-5 w-5 text-[#2563EB]" />
          <h2 className="text-lg font-black text-slate-950">
            {editingItem ? "Edit portfolio" : "Add portfolio"}
          </h2>
        </div>

        <div className="grid gap-4">
          <input type="hidden" {...register("id")} />
          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">Title</span>
            <input
              {...register("title")}
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
            {errors.title?.message ? (
              <p className="text-xs font-semibold text-red-600">{errors.title.message}</p>
            ) : null}
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">Image URL</span>
            <input
              {...register("imageUrl")}
              type="url"
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
            {errors.imageUrl?.message ? (
              <p className="text-xs font-semibold text-red-600">{errors.imageUrl.message}</p>
            ) : null}
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">Description</span>
            <textarea
              {...register("description")}
              rows={3}
              className="resize-none rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Event type</span>
              <input
                {...register("eventType")}
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Event date</span>
              <input
                {...register("eventDate")}
                type="date"
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">City</span>
              <input
                {...register("city")}
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Province</span>
              <input
                {...register("province")}
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-slate-700">Sort</span>
              <input
                {...register("sortOrder")}
                type="number"
                min="0"
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </label>
            <label className="mt-7 flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                {...register("isFeatured")}
                className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
              />
              Featured
            </label>
          </div>
        </div>

        {formMessage ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            {formMessage}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
          {editingItem ? (
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
            {isPending ? "Saving..." : "Save portfolio"}
          </button>
        </div>
      </form>

      {profile.portfolio.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
          No portfolio items yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profile.portfolio.map((item) => (
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {[item.eventType, item.city, item.province].filter(Boolean).join(" / ")}
                    </p>
                  </div>
                  {item.isFeatured ? (
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                      Featured
                    </span>
                  ) : null}
                </div>
                {item.description ? (
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    {item.description}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-slate-600 transition hover:border-[#2563EB] hover:text-[#1D4ED8]"
                >
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
