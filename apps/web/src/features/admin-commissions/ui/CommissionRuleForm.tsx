"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createCommissionRuleSchema,
  updateCommissionRuleSchema,
  type CreateCommissionRuleInput,
  type UpdateCommissionRuleInput,
} from "../schemas/commission-rule.schema";
import { createCommissionRuleAction, updateCommissionRuleAction } from "../application/actions";
import type { CommissionRule, VenueCategoryOption } from "../types/commission-rule.types";

const inputClass =
  "w-full rounded-xl border border-[#dbe3ef] bg-white p-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]";
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#64748b]";

export function CreateCommissionRuleForm({ categories }: { categories: VenueCategoryOption[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCommissionRuleInput>({
    resolver: zodResolver(createCommissionRuleSchema),
    defaultValues: { scope: "global", effectiveFrom: new Date().toISOString().slice(0, 10) },
  });

  const scope = watch("scope");

  async function onSubmit(values: CreateCommissionRuleInput) {
    const result = await createCommissionRuleAction(values);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Commission rule created");
    reset();
    setIsOpen(false);
    router.refresh();
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 items-center rounded-xl bg-[#1d4ed8] px-5 text-sm font-bold text-white hover:bg-[#1e40af]"
      >
        Add commission rule
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="scope" className={labelClass}>Scope</label>
          <select id="scope" {...register("scope")} className={inputClass}>
            <option value="global">Global default</option>
            <option value="category">Venue category</option>
            <option value="venue">Specific venue</option>
          </select>
        </div>

        {scope === "category" ? (
          <div>
            <label htmlFor="referenceId" className={labelClass}>Category</label>
            <select id="referenceId" {...register("referenceId")} className={inputClass}>
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.referenceId ? <p className="mt-1 text-xs text-red-700">{errors.referenceId.message}</p> : null}
          </div>
        ) : null}

        {scope === "venue" ? (
          <div>
            <label htmlFor="referenceId" className={labelClass}>Venue ID</label>
            <input id="referenceId" {...register("referenceId")} placeholder="Paste the venue's UUID" className={inputClass} />
            <p className="mt-1 text-xs text-[#6b7280]">Find this in the venue's review page URL.</p>
            {errors.referenceId ? <p className="mt-1 text-xs text-red-700">{errors.referenceId.message}</p> : null}
          </div>
        ) : null}

        <div>
          <label htmlFor="label" className={labelClass}>Label <span className="font-normal normal-case text-[#6b7280]">(optional)</span></label>
          <input id="label" {...register("label")} placeholder="e.g. Summer 2026 promo" className={inputClass} />
        </div>

        <div>
          <label htmlFor="percentage" className={labelClass}>Percentage</label>
          <input id="percentage" type="number" step="0.01" {...register("percentage")} className={inputClass} />
        </div>
        <div>
          <label htmlFor="flatFee" className={labelClass}>Flat fee (₱)</label>
          <input id="flatFee" type="number" step="0.01" {...register("flatFee")} className={inputClass} />
        </div>
        {errors.percentage ? <p className="text-xs text-red-700 sm:col-span-2 lg:col-span-3">{errors.percentage.message}</p> : null}

        <div>
          <label htmlFor="minCommissionAmount" className={labelClass}>Minimum commission (₱)</label>
          <input id="minCommissionAmount" type="number" step="0.01" {...register("minCommissionAmount")} className={inputClass} />
        </div>
        <div>
          <label htmlFor="maxCommissionAmount" className={labelClass}>Maximum commission (₱)</label>
          <input id="maxCommissionAmount" type="number" step="0.01" {...register("maxCommissionAmount")} className={inputClass} />
        </div>

        <div>
          <label htmlFor="effectiveFrom" className={labelClass}>Effective from</label>
          <input id="effectiveFrom" type="date" {...register("effectiveFrom")} className={inputClass} />
        </div>
        <div>
          <label htmlFor="effectiveTo" className={labelClass}>Effective to <span className="font-normal normal-case text-[#6b7280]">(optional)</span></label>
          <input id="effectiveTo" type="date" {...register("effectiveTo")} className={inputClass} />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[#e5e7eb] pt-4">
        <button type="button" onClick={() => { setIsOpen(false); reset(); }} className="rounded-lg px-4 py-2 text-sm font-bold text-[#4b5563] hover:bg-white">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-5 py-2 text-sm font-bold text-white hover:bg-[#1e40af] disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create rule
        </button>
      </div>
    </form>
  );
}

export function EditCommissionRuleDialog({ rule }: { rule: CommissionRule }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateCommissionRuleInput>({
    resolver: zodResolver(updateCommissionRuleSchema),
    defaultValues: {
      id: rule.id,
      label: rule.label ?? "",
      percentage: rule.percentage ?? undefined,
      flatFee: rule.flatFee ?? undefined,
      minCommissionAmount: rule.minCommissionAmount ?? undefined,
      maxCommissionAmount: rule.maxCommissionAmount ?? undefined,
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo ?? undefined,
      isActive: rule.isActive,
      reason: "",
    },
  });

  async function onSubmit(values: UpdateCommissionRuleInput) {
    const result = await updateCommissionRuleAction(values);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Commission rule updated");
    setIsOpen(false);
    router.refresh();
  }

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (isSubmitting) return;
        setIsOpen(open);
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-lg border border-[#dbe3ef] bg-white px-3 text-xs font-bold text-[#111827] hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
        >
          Edit
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl"
          onEscapeKeyDown={(e) => {
            if (isSubmitting) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (isSubmitting) e.preventDefault();
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-black text-slate-900">Edit commission rule</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Edit the percentage, flat fee, and effective dates for this commission rule.
          </Dialog.Description>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="edit-label" className={labelClass}>Label</label>
                  <input id="edit-label" {...register("label")} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="edit-percentage" className={labelClass}>Percentage</label>
                  <input id="edit-percentage" type="number" step="0.01" {...register("percentage")} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="edit-flatFee" className={labelClass}>Flat fee (₱)</label>
                  <input id="edit-flatFee" type="number" step="0.01" {...register("flatFee")} className={inputClass} />
                </div>
                {errors.percentage ? <p className="text-xs text-red-700 sm:col-span-2">{errors.percentage.message}</p> : null}
                <div>
                  <label htmlFor="edit-min" className={labelClass}>Minimum commission (₱)</label>
                  <input id="edit-min" type="number" step="0.01" {...register("minCommissionAmount")} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="edit-max" className={labelClass}>Maximum commission (₱)</label>
                  <input id="edit-max" type="number" step="0.01" {...register("maxCommissionAmount")} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="edit-from" className={labelClass}>Effective from</label>
                  <input id="edit-from" type="date" {...register("effectiveFrom")} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="edit-to" className={labelClass}>Effective to</label>
                  <input id="edit-to" type="date" {...register("effectiveTo")} className={inputClass} />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input id="edit-active" type="checkbox" {...register("isActive")} className="h-4 w-4 rounded border-[#dbe3ef]" />
                  <label htmlFor="edit-active" className="text-sm font-semibold text-[#111827]">Active</label>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="edit-reason" className={labelClass}>Reason for this change</label>
                  <textarea id="edit-reason" {...register("reason")} rows={2} className={inputClass} />
                  {errors.reason ? <p className="mt-1 text-xs text-red-700">{errors.reason.message}</p> : null}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Dialog.Close asChild>
                  <button type="button" disabled={isSubmitting} className="rounded-lg px-4 py-2 text-sm font-bold text-[#4b5563] hover:bg-slate-100 disabled:opacity-50">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-5 py-2 text-sm font-bold text-white hover:bg-[#1e40af] disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save changes
                </button>
              </div>
            </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
