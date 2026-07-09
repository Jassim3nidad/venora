"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Calculator } from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Button,
} from "@venora/ui";
import type { AICostEstimatorInput } from "../schemas/ai.schema";

const eventTypeOptions = [
  "Wedding",
  "Birthday",
  "Debut",
  "Corporate Event",
  "Christening",
  "Reunion",
  "Other",
] as const;

const costEstimatorFormSchema = z.object({
  guestCount: z.coerce.number().int().min(1, "Enter at least 1 guest"),
  eventType: z.string().min(2, "Choose an event type"),
  durationHours: z.coerce.number().positive("Enter the event duration"),
  includesCatering: z.boolean(),
  includesAv: z.boolean(),
});

type CostEstimatorFormValues = z.infer<typeof costEstimatorFormSchema>;

interface CostEstimatorFormProps {
  capacityMin?: number | null | undefined;
  capacityMax?: number | null | undefined;
  isPending: boolean;
  onSubmit: (input: Omit<AICostEstimatorInput, "venue_id">) => void;
}

export default function CostEstimatorForm({
  capacityMin,
  capacityMax,
  isPending,
  onSubmit,
}: CostEstimatorFormProps) {
  const form = useForm<CostEstimatorFormValues>({
    resolver: zodResolver(costEstimatorFormSchema),
    defaultValues: {
      guestCount: capacityMin ?? 50,
      eventType: "",
      durationHours: 4,
      includesCatering: false,
      includesAv: false,
    },
  });

  function handleSubmit(values: CostEstimatorFormValues) {
    onSubmit({
      guest_count: values.guestCount,
      event_type: values.eventType,
      duration_hours: values.durationHours,
      includes_catering: values.includesCatering,
      includes_av: values.includesAv,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="guestCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-[var(--text-primary)] tracking-wide uppercase">
                  Guest Count
                </FormLabel>
                <FormControl>
                  <input
                    {...field}
                    type="number"
                    min={1}
                    className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 focus:border-[var(--color-brand-500)] transition-all"
                  />
                </FormControl>
                {(capacityMin || capacityMax) && (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Venue capacity: {capacityMin ?? "—"}–{capacityMax ?? "—"} guests
                  </p>
                )}
                <FormMessage className="text-xs text-red-500 font-medium" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="durationHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-[var(--text-primary)] tracking-wide uppercase">
                  Duration (hours)
                </FormLabel>
                <FormControl>
                  <input
                    {...field}
                    type="number"
                    min={1}
                    step={0.5}
                    className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 focus:border-[var(--color-brand-500)] transition-all"
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-500 font-medium" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="eventType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-[var(--text-primary)] tracking-wide uppercase">
                Event Type
              </FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 focus:border-[var(--color-brand-500)] transition-all"
                >
                  <option value="" disabled>
                    Select an event type
                  </option>
                  {eventTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage className="text-xs text-red-500 font-medium" />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-2.5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4">
          <label className="flex items-center gap-2.5 text-sm font-medium text-[var(--text-primary)]">
            <input
              type="checkbox"
              {...form.register("includesCatering")}
              className="h-4 w-4 rounded border-[var(--border-default)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)]/30"
            />
            Include catering estimate
          </label>
          <label className="flex items-center gap-2.5 text-sm font-medium text-[var(--text-primary)]">
            <input
              type="checkbox"
              {...form.register("includesAv")}
              className="h-4 w-4 rounded border-[var(--border-default)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)]/30"
            />
            Include sound & AV estimate
          </label>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-xl text-sm font-semibold bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20 transition-all flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Estimating...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              Estimate Cost
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
