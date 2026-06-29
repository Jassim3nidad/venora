"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBookingSchema, type CreateBookingInput } from "../schemas/booking.schema";
import { useCreateBooking } from "../hooks/use-create-booking";

interface BookingFormProps {
  venueId: string;
  packageId?: string;
  capacityMin: number;
  capacityMax: number;
  customerId: string;
  onSuccess?: (bookingId: string) => void;
}

export function BookingForm({
  venueId,
  packageId,
  capacityMin,
  capacityMax,
  customerId,
  onSuccess,
}: BookingFormProps) {
  const { mutate, isPending, isError, error } = useCreateBooking(customerId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      venueId:   venueId,
      packageId: packageId,
    },
  });

  function onSubmit(data: CreateBookingInput) {
    mutate(data, {
      onSuccess: (booking) => onSuccess?.(booking.id),
    });
  }

  return (
    <form
      id="booking-feature-form"
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <input type="hidden" {...register("venueId")} />
      {packageId && <input type="hidden" {...register("packageId")} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="bf-event-date" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Event date</label>
          <input id="bf-event-date" type="date" {...register("eventDate")}
            style={{ height: "2.75rem", borderRadius: "0.625rem", border: `1px solid ${errors.eventDate ? "hsl(0 72% 51%)" : "var(--border-default)"}`, padding: "0 0.875rem", background: "var(--bg-subtle)", fontSize: "0.9375rem", outline: "none" }} />
          {errors.eventDate && <p role="alert" style={{ fontSize: "0.75rem", color: "hsl(0 72% 51%)" }}>{errors.eventDate.message}</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="bf-guest-count" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Guests</label>
          <input id="bf-guest-count" type="number" min={capacityMin} max={capacityMax}
            {...register("guestCount", { valueAsNumber: true })}
            style={{ height: "2.75rem", borderRadius: "0.625rem", border: `1px solid ${errors.guestCount ? "hsl(0 72% 51%)" : "var(--border-default)"}`, padding: "0 0.875rem", background: "var(--bg-subtle)", fontSize: "0.9375rem", outline: "none" }} />
          {errors.guestCount && <p role="alert" style={{ fontSize: "0.75rem", color: "hsl(0 72% 51%)" }}>{errors.guestCount.message}</p>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label htmlFor="bf-special-requests" style={{ fontSize: "0.875rem", fontWeight: 500 }}>Special Requests (optional)</label>
        <textarea id="bf-special-requests" rows={3} {...register("specialRequests")}
          style={{ borderRadius: "0.625rem", border: "1px solid var(--border-default)", padding: "0.75rem 0.875rem", background: "var(--bg-subtle)", fontSize: "0.9375rem", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
      </div>

      {isError && (
        <div role="alert" style={{ padding: "0.75rem 1rem", borderRadius: "0.5rem", background: "hsl(0 72% 51% / 0.1)", color: "hsl(0 72% 51%)", fontSize: "0.875rem" }}>
          {error?.message ?? "Something went wrong. Please try again."}
        </div>
      )}

      <button id="bf-submit-btn" type="submit" disabled={isPending}
        style={{ height: "3rem", borderRadius: "0.75rem", background: isPending ? "var(--border-strong)" : "hsl(262 70% 47%)", color: "#fff", fontWeight: 700, fontSize: "1rem", border: "none", cursor: isPending ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
        {isPending ? "Submitting…" : "Request Booking"}
      </button>
    </form>
  );
}
