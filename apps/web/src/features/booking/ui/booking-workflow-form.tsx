"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  MessageSquareText,
  PackageCheck,
  TicketCheck,
  Users,
} from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { useForm } from "react-hook-form";
import { Calendar } from "@venora/ui";
import {
  createBookingSchema,
  type CreateBookingInput,
} from "../schemas/booking.schema";
import {
  getLocalDateInputValue,
  isPastDate,
  parseLocalDateOnly,
  PAST_DATE_MESSAGE,
} from "@/src/lib/date-only";
import {
  CustomerButton,
  CustomerStatusBadge,
} from "@/src/components/customer/CustomerUI";
import { useCalendar } from "@/src/features/calendar/hooks/use-calendar";
import {
  buildCustomerAvailabilityMap,
  getCustomerAvailabilityMessage,
  isCustomerSelectableAvailabilityStatus,
} from "@/src/features/calendar/utils/availability";

type BookingPackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_unit: "per_event" | "per_hour" | "per_pax" | "per_day";
  min_guests: number | null;
  max_guests: number | null;
  inclusions: string[] | null;
};

type BookingWorkflowFormProps = {
  venueId: string;
  venueName: string;
  venueSlug: string;
  basePrice: number | null;
  priceUnit: "per_event" | "per_hour" | "per_pax" | "per_day";
  capacityMin: number;
  capacityMax: number;
  packages: BookingPackage[];
  initialDate?: string;
  initialGuests?: number;
  initialPackageId?: string;
};

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Price pending";
  }

  return currency.format(value);
}

function unitLabel(unit: string) {
  switch (unit) {
    case "per_hour":
      return "hour";
    case "per_pax":
      return "guest";
    case "per_day":
      return "day";
    default:
      return "event";
  }
}

export function BookingWorkflowForm({
  venueId,
  venueName,
  venueSlug,
  basePrice,
  priceUnit,
  capacityMin,
  capacityMax,
  packages,
  initialDate,
  initialGuests,
  initialPackageId,
}: BookingWorkflowFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(parseLocalDateOnly(initialDate ?? "") ?? new Date()),
  );

  const defaultPackageId =
    initialPackageId && packages.some((item) => item.id === initialPackageId)
      ? initialPackageId
      : "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      venueId,
      packageId: defaultPackageId || null,
      eventDate: initialDate ?? getLocalDateInputValue(),
      eventStartTime: "",
      eventEndTime: "",
      guestCount: initialGuests ?? capacityMin,
      specialRequests: "",
    },
  });

  const selectedPackageId = watch("packageId") ?? "";
  const selectedDateValue = watch("eventDate");
  const selectedDate = parseLocalDateOnly(selectedDateValue);
  const guestCount = Number(watch("guestCount") ?? capacityMin);
  const selectedPackage = packages.find(
    (item) => item.id === selectedPackageId,
  );
  const {
    availability,
    isLoading: isLoadingAvailability,
    error: availabilityError,
  } = useCalendar(venueId, calendarMonth, {
    includeAvailability: false,
    includeBookings: false,
    realtime: false,
  });

  const price = selectedPackage?.price ?? basePrice ?? 0;
  const unit = selectedPackage?.price_unit ?? priceUnit;
  const chargeUnits = unit === "per_pax" ? Math.max(guestCount, 1) : 1;
  const subtotal = price * chargeUnits;
  const serviceFee = Math.round(subtotal * 0.03);
  const estimatedTotal = subtotal + serviceFee;
  const estimatedDeposit = Math.round(estimatedTotal * 0.5);

  const activeMinGuests = selectedPackage?.min_guests ?? capacityMin;
  const activeMaxGuests = selectedPackage?.max_guests ?? capacityMax;

  const packageOptions = useMemo(
    () => [
      {
        id: "",
        name: "Custom venue quote",
        description:
          "Use the venue base rate and let the team tailor the final quote.",
        price: basePrice ?? 0,
        price_unit: priceUnit,
        min_guests: capacityMin,
        max_guests: capacityMax,
        inclusions: [],
      },
      ...packages,
    ],
    [basePrice, capacityMax, capacityMin, packages, priceUnit],
  );
  const calendarAvailability = useMemo(
    () => buildCustomerAvailabilityMap(availability),
    [availability],
  );
  const selectedAvailabilityStatus = selectedDateValue
    ? calendarAvailability[selectedDateValue]
    : undefined;
  const selectedDateIsPast = selectedDate ? isPastDate(selectedDate) : false;
  const selectedDateIsBlocked =
    selectedDateIsPast ||
    !isCustomerSelectableAvailabilityStatus(selectedAvailabilityStatus);
  const dateFeedback = selectedDateIsPast
    ? PAST_DATE_MESSAGE
    : getCustomerAvailabilityMessage(selectedAvailabilityStatus);

  async function onSubmit(input: CreateBookingInput) {
    setFormError(null);

    if (selectedDateIsBlocked) {
      setFormError(dateFeedback);
      return;
    }

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        packageId: input.packageId || null,
      }),
    });

    const result = (await response.json()) as
      | {
          data: { bookingId: string; status: string; eventDate: string };
          error: null;
        }
      | {
          data: null;
          error: { code: string; message: string; details?: unknown };
        };

    if (!response.ok || result.error) {
      setFormError(result.error?.message ?? "Could not submit inquiry.");
      return;
    }

    router.push("/bookings?created=1");
    router.refresh();
  }

  return (
    <form
      id="booking-form"
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-6"
    >
      <input type="hidden" {...register("venueId")} />

      <section className="grid gap-4 rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <CustomerStatusBadge icon={CalendarDays}>Date</CustomerStatusBadge>
          <h2 className="mt-3 text-xl font-bold tracking-[-0.03em] text-slate-950">
            Choose your event date.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="relative grid gap-2 text-sm font-bold text-slate-700 sm:col-span-3">
            Event date
            <input type="hidden" {...register("eventDate")} />
            <button
              type="button"
              onClick={() => setShowCalendar((value) => !value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                setShowCalendar((value) => !value);
              }}
              className="flex h-12 w-full items-center justify-between rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-left text-sm font-semibold text-slate-900 outline-none transition hover:border-[#BFDBFE] hover:bg-white focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              aria-expanded={showCalendar}
              aria-controls="booking-date-calendar"
            >
              <span className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-[#2563EB]" />
                {selectedDate
                  ? format(selectedDate, "MMMM d, yyyy")
                  : "Select an event date"}
              </span>
              {isLoadingAvailability ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
              ) : null}
            </button>
            {showCalendar ? (
              <div
                id="booking-date-calendar"
                className="absolute left-0 right-0 top-[5.75rem] z-40 rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-2xl sm:left-auto sm:w-[360px]"
              >
                {availabilityError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                    Availability could not load. Refresh and try again.
                  </div>
                ) : (
                  <>
                    <Calendar
                      {...(selectedDate ? { selectedDate } : {})}
                      disablePastDates
                      currentMonth={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      availability={calendarAvailability}
                      onDateSelect={(date) => {
                        if (isPastDate(date)) return;
                        setValue("eventDate", format(date, "yyyy-MM-dd"), {
                          shouldValidate: true,
                        });
                        setShowCalendar(false);
                      }}
                    />
                    {!isLoadingAvailability && availability.length === 0 ? (
                      <p className="mt-3 rounded-2xl bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-slate-500">
                        Availability is confirmed before your request is
                        submitted.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
            {selectedDate ? (
              <span
                className={[
                  "rounded-2xl px-3 py-2 text-xs font-bold",
                  selectedDateIsBlocked
                    ? "bg-red-50 text-red-700"
                    : "bg-emerald-50 text-emerald-700",
                ].join(" ")}
              >
                {dateFeedback}
              </span>
            ) : null}
            {errors.eventDate ? (
              <span className="text-xs font-semibold text-red-600">
                {errors.eventDate.message}
              </span>
            ) : null}
          </div>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Start time
            <span className="relative">
              <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563EB]" />
              <input
                type="time"
                className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                {...register("eventStartTime")}
              />
            </span>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            End time
            <span className="relative">
              <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563EB]" />
              <input
                type="time"
                className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                {...register("eventEndTime")}
              />
            </span>
          </label>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <CustomerStatusBadge icon={PackageCheck}>Package</CustomerStatusBadge>
          <h2 className="mt-3 text-xl font-bold tracking-[-0.03em] text-slate-950">
            Choose a package.
          </h2>
        </div>

        <div className="grid gap-3">
          {packageOptions.map((option) => {
            const checked = selectedPackageId === option.id;
            return (
              <label
                key={option.id || "custom"}
                className={[
                  "grid cursor-pointer gap-3 rounded-3xl border p-4 transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
                  checked
                    ? "border-[#2563EB] bg-[#EFF6FF] ring-4 ring-[#2563EB]/10"
                    : "border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#BFDBFE] hover:bg-white",
                ].join(" ")}
              >
                <span className="flex min-w-0 gap-3">
                  <span
                    className={[
                      "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      checked
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-slate-300 bg-white",
                    ].join(" ")}
                  >
                    {checked ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-bold text-slate-950">
                      {option.name}
                    </span>
                    <span className="mt-1 block text-sm font-medium leading-6 text-slate-500">
                      {option.description}
                    </span>
                    <span className="mt-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                      {option.min_guests ?? capacityMin}-
                      {option.max_guests ?? capacityMax} guests
                    </span>
                  </span>
                </span>

                <span className="text-left sm:text-right">
                  <span className="block text-lg font-bold text-slate-950">
                    {formatCurrency(option.price)}
                  </span>
                  <span className="block text-xs font-bold text-slate-500">
                    per {unitLabel(option.price_unit)}
                  </span>
                </span>

                <input
                  type="radio"
                  className="sr-only"
                  value={option.id}
                  checked={checked}
                  onChange={() => {
                    setValue("packageId", option.id || null, {
                      shouldValidate: true,
                    });
                    if (guestCount < (option.min_guests ?? capacityMin)) {
                      setValue("guestCount", option.min_guests ?? capacityMin, {
                        shouldValidate: true,
                      });
                    }
                    if (guestCount > (option.max_guests ?? capacityMax)) {
                      setValue("guestCount", option.max_guests ?? capacityMax, {
                        shouldValidate: true,
                      });
                    }
                  }}
                />
              </label>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <CustomerStatusBadge icon={Users}>Inquiry</CustomerStatusBadge>
          <h2 className="mt-3 text-xl font-bold tracking-[-0.03em] text-slate-950">
            Add guest count and notes.
          </h2>
        </div>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Guests
          <span className="relative">
            <Users className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563EB]" />
            <input
              type="number"
              min={activeMinGuests}
              max={activeMaxGuests}
              className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              {...register("guestCount", { valueAsNumber: true })}
            />
          </span>
          <span className="text-xs font-semibold text-slate-400">
            Capacity for this selection:{" "}
            {activeMinGuests.toLocaleString("en-PH")} to{" "}
            {activeMaxGuests.toLocaleString("en-PH")}
          </span>
          {errors.guestCount ? (
            <span className="text-xs font-semibold text-red-600">
              {errors.guestCount.message}
            </span>
          ) : null}
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Notes
          <span className="relative">
            <MessageSquareText className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-[#2563EB]" />
            <textarea
              rows={5}
              placeholder="Tell the venue what you are planning..."
              className="min-h-32 w-full resize-y rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] py-3 pl-11 pr-4 text-sm font-semibold leading-6 outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              {...register("specialRequests")}
            />
          </span>
          {errors.specialRequests ? (
            <span className="text-xs font-semibold text-red-600">
              {errors.specialRequests.message}
            </span>
          ) : null}
        </label>
      </section>

      <section className="rounded-3xl border border-[#DBEAFE] bg-[#EFF6FF] p-5 text-[#1D4ED8] sm:p-6">
        <div className="grid gap-3 text-sm font-bold">
          <div className="flex items-center justify-between gap-4">
            <span>
              {formatCurrency(price)} x {chargeUnits} {unitLabel(unit)}
              {chargeUnits > 1 ? "s" : ""}
            </span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-[#BFDBFE] pt-3">
            <span>Platform service fee</span>
            <span>{formatCurrency(serviceFee)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-[#BFDBFE] pt-3 text-base font-bold">
            <span>Estimated quote</span>
            <span>{formatCurrency(estimatedTotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs font-extrabold uppercase tracking-[0.12em] text-[#2563EB]">
            <span>Estimated deposit after approval</span>
            <span>{formatCurrency(estimatedDeposit)}</span>
          </div>
        </div>
      </section>

      {formError ? (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
          role="alert"
        >
          {formError}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <CustomerButton
          type="submit"
          disabled={
            isSubmitting ||
            isLoadingAvailability ||
            Boolean(availabilityError) ||
            !selectedDate ||
            selectedDateIsBlocked
          }
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <TicketCheck className="h-4 w-4" />
          )}
          {isSubmitting ? "Submitting" : "Submit Inquiry"}
        </CustomerButton>
        <a
          href={`/venues/${venueSlug}`}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
        >
          Back to {venueName}
        </a>
      </div>
    </form>
  );
}
