"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { updateAvailabilitySchema, UpdateAvailabilityInput } from "../schemas/calendar.schema";
import { updateAvailability } from "../application/calendar-actions";
import { VenueAvailability } from "../hooks/use-calendar";

interface DateEditorModalProps {
  venueId: string;
  isOpen: boolean;
  date: Date | null;
  availability: VenueAvailability | undefined;
  onClose: () => void;
}

export function DateEditorModal({ venueId, isOpen, date, availability, onClose }: DateEditorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UpdateAvailabilityInput>({
    resolver: zodResolver(updateAvailabilitySchema),
    defaultValues: {
      venueId,
      date: date ? format(date, "yyyy-MM-dd") : "",
      status: "available",
      seasonalPriceOverride: null,
      note: "",
    },
  });

  const selectedStatus = watch("status");

  // Reset form when modal opens or date changes
  useEffect(() => {
    if (isOpen && date) {
      reset({
        venueId,
        date: format(date, "yyyy-MM-dd"),
        status: availability?.status ?? "available",
        seasonalPriceOverride: availability?.seasonal_price_override ?? null,
        note: availability?.note ?? "",
      });
    }
  }, [isOpen, date, availability, venueId, reset]);

  const onSubmit = async (data: UpdateAvailabilityInput) => {
    setIsSubmitting(true);
    try {
      const res = await updateAvailability(data);
      if (res.success) {
        toast.success("Availability updated successfully");
        onClose();
      } else {
        toast.error(res.error || "Failed to update availability");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !date) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Edit Date: {format(date, "MMM d, yyyy")}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
            <select
              {...register("status")}
              className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="available">Available</option>
              <option value="tentative">Tentative</option>
              <option value="reserved">Reserved</option>
              <option value="maintenance">Maintenance</option>
              <option value="blackout">Blackout (Closed)</option>
            </select>
            {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>}
          </div>

          {(selectedStatus === "available" || selectedStatus === "tentative") && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Seasonal Price Override (₱)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Leave blank for default base price"
                {...register("seasonalPriceOverride", { valueAsNumber: true })}
                className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">If set, this overrides the venue's base price for this specific date.</p>
              {errors.seasonalPriceOverride && <p className="text-red-500 text-xs mt-1">{errors.seasonalPriceOverride.message}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Internal Note</label>
            <textarea
              placeholder="E.g., Renovating pool area"
              rows={3}
              {...register("note")}
              className="w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {errors.note && <p className="text-red-500 text-xs mt-1">{errors.note.message}</p>}
          </div>

          <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
