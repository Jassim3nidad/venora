"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar, Loader2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { updateAvailability } from "../application/calendar-actions";
import type {
  UpdateAvailabilityInput} from "../schemas/calendar.schema";
import {
  updateAvailabilitySchema,
} from "../schemas/calendar.schema";
import type { Booking, VenueAvailability } from "../hooks/use-calendar";
import {
  AVAILABILITY_DESCRIPTIONS,
  AVAILABILITY_LABELS,
  AVAILABILITY_STATUSES,
  isActiveBookingStatus,
} from "../utils/availability";

interface DateEditorModalProps {
  venueId: string;
  isOpen: boolean;
  date: Date | null;
  availability: VenueAvailability | undefined;
  bookings?: Booking[];
  onClose: () => void;
}

function statusHelp(status: string) {
  switch (status) {
    case "tentative":
      return "Use this for pending holds. Customers cannot request this date.";
    case "reserved":
      return "Use this for dates booked outside Venora. Customers cannot request this date.";
    case "maintenance":
      return "Use this for repairs, renovation, cleaning, or setup downtime.";
    case "blackout":
      return "Use this to block a date for private events, holidays, or staff closure.";
    default:
      return "Clear manual restrictions so customers can submit booking requests.";
  }
}

export function DateEditorModal({
  venueId,
  isOpen,
  date,
  availability,
  bookings = [],
  onClose,
}: DateEditorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const activeBookings = bookings.filter((booking) =>
    isActiveBookingStatus(booking.status),
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateAvailabilityInput>({
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

  async function saveAvailability(data: UpdateAvailabilityInput) {
    if (!date) return;

    setIsSubmitting(true);
    try {
      const result = await updateAvailability(data);

      if (result.success) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.calendar.availability(
            venueId,
            format(date, "yyyy-MM"),
          ),
        });
        toast.success(
          data.status === "available"
            ? "Date is available again."
            : "Availability updated.",
        );
        onClose();
      } else {
        toast.error(result.error || "Failed to update availability.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || !date) return null;

  const formattedDate = format(date, "MMMM d, yyyy");
  const canClear = activeBookings.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] bg-[#f8fbff] p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#2563eb]">
              Venue availability
            </p>
            <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-black text-[#0f172a]">
              <Calendar className="h-5 w-5 text-[#2563eb]" />
              {formattedDate}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#64748b] transition hover:bg-white"
            aria-label="Close date editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(saveAvailability)}
          className="grid gap-5 p-5"
        >
          {activeBookings.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-800">
                This date has active Venora booking activity.
              </p>
              <div className="mt-3 grid gap-2">
                {activeBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#475569]"
                  >
                    {booking.customer.full_name || "Customer"} -{" "}
                    {booking.status.replace(/_/g, " ")} -{" "}
                    {booking.guest_count.toLocaleString("en-PH")} guests
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold text-amber-800">
                Manual availability changes are disabled until active booking
                requests are declined, cancelled, expired, or otherwise leave
                the active workflow.
              </p>
            </div>
          ) : null}

          <div className="grid gap-2">
            <label
              htmlFor="availability-status"
              className="text-sm font-black text-[#334155]"
            >
              Date status
            </label>
            <select
              id="availability-status"
              {...register("status")}
              className="h-12 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
            >
              {AVAILABILITY_STATUSES.map((status) => (
                <option
                  key={status}
                  value={status}
                  disabled={status === "available" && !canClear}
                >
                  {AVAILABILITY_LABELS[status]}
                </option>
              ))}
            </select>
            <p className="text-xs font-semibold text-[#64748b]">
              {statusHelp(selectedStatus)}
            </p>
            {errors.status ? (
              <p className="text-xs font-semibold text-red-600">
                {errors.status.message}
              </p>
            ) : null}
          </div>

          {selectedStatus === "available" || selectedStatus === "tentative" ? (
            <div className="grid gap-2">
              <label
                htmlFor="seasonal-price"
                className="text-sm font-black text-[#334155]"
              >
                Seasonal price override
              </label>
              <input
                id="seasonal-price"
                type="number"
                step="0.01"
                placeholder="Leave blank to use the base price"
                {...register("seasonalPriceOverride", { valueAsNumber: true })}
                className="h-12 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-semibold text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
              />
              {errors.seasonalPriceOverride ? (
                <p className="text-xs font-semibold text-red-600">
                  {errors.seasonalPriceOverride.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2">
            <label
              htmlFor="availability-note"
              className="text-sm font-black text-[#334155]"
            >
              Reason or internal note
            </label>
            <textarea
              id="availability-note"
              placeholder="Example: Private event, renovation, staff unavailable"
              rows={4}
              {...register("note")}
              className="resize-none rounded-2xl border border-[#dbe3ef] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
            />
            {errors.note ? (
              <p className="text-xs font-semibold text-red-600">
                {errors.note.message}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-[#f8fafc] p-4 text-sm font-semibold text-[#64748b]">
            {AVAILABILITY_DESCRIPTIONS[selectedStatus]}
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e5e7eb] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#334155] transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !canClear}
              onClick={() => {
                setValue("status", "available", { shouldValidate: true });
                setValue("seasonalPriceOverride", null, {
                  shouldValidate: true,
                });
                setValue("note", "", { shouldValidate: true });
                void handleSubmit(saveAvailability)();
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear / Unblock
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canClear}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 text-sm font-bold text-white shadow-sm shadow-blue-200/70 transition hover:bg-[#1e40af] disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
