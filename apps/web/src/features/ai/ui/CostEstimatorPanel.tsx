"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  Button,
} from "@venora/ui";
import CostEstimatorForm from "./CostEstimatorForm";
import CostEstimatorResult from "./CostEstimatorResult";
import { useCostEstimator } from "../hooks/use-cost-estimator";
import type { AICostEstimatorInput } from "../schemas/ai.schema";

interface CostEstimatorPanelProps {
  venueId: string;
  venueName: string;
  initialGuestCount?: number | undefined;
  capacityMin?: number | null | undefined;
  capacityMax?: number | null | undefined;
}

export default function CostEstimatorPanel({
  venueId,
  venueName,
  initialGuestCount,
  capacityMin,
  capacityMax,
}: CostEstimatorPanelProps) {
  const [open, setOpen] = useState(false);
  const { mutate, data, error, isPending, reset } = useCostEstimator();

  function handleSubmit(input: Omit<AICostEstimatorInput, "venue_id">) {
    mutate({ ...input, venue_id: venueId });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-[#E5E7EB] px-4 text-sm font-bold text-[#111827] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
        >
          <Calculator className="h-4 w-4" />
          Estimate Event Cost
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] rounded-3xl border border-[var(--border-default)] bg-[var(--bg-base)] p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Estimate Your Event Cost
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--text-secondary)] mt-1">
            Tell us about your event and get an AI-generated cost breakdown for{" "}
            {venueName}.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl border border-red-200/20 bg-red-500/10 text-red-600 text-xs font-medium">
              ⚠️ {error.message}
            </div>
          )}

          {data ? (
            <CostEstimatorResult result={data} onReset={reset} />
          ) : open ? (
            <CostEstimatorForm
              key={`guests-${initialGuestCount ?? "default"}`}
              initialGuestCount={initialGuestCount}
              capacityMin={capacityMin}
              capacityMax={capacityMax}
              isPending={isPending}
              onSubmit={handleSubmit}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
