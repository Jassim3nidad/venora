"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  HelpCircle,
  Info,
  Loader2,
} from "lucide-react";
import {
  Calendar,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@venora/ui";
import { format, startOfMonth } from "date-fns";
import { checkAvailabilityAction } from "../application/actions";
import { isPastDate, PAST_DATE_MESSAGE } from "@/src/lib/date-only";
import { useCalendar } from "@/src/features/calendar/hooks/use-calendar";

interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_unit: "per_event" | "per_hour" | "per_pax" | "per_day";
  min_guests: number | null;
  max_guests: number | null;
  inclusions: string[];
}

interface BookingSidebarProps {
  venueId: string;
  venueSlug?: string | null;
  venueName: string;
  basePrice: number;
  priceUnit: "per_event" | "per_hour" | "per_pax" | "per_day";
  capacityMin: number;
  capacityMax: number;
  packages: Package[];
  children?: React.ReactNode | ((guestCount: number) => React.ReactNode);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function BookingSidebar({
  venueId,
  venueSlug,
  venueName,
  basePrice,
  priceUnit,
  capacityMin,
  capacityMax,
  packages = [],
  children,
}: BookingSidebarProps) {
  const router = useRouter();

  // State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [guests, setGuests] = useState<number>(capacityMin);
  const [inputValue, setInputValue] = useState<string>(capacityMin.toString());
  const [selectedPackageId, setSelectedPackageId] = useState<string>("none");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<
    "idle" | "available" | "unavailable"
  >("idle");
  const [overridePrice, setOverridePrice] = useState<number | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(new Date()),
  );

  const { availability } = useCalendar(venueId, calendarMonth);
  const calendarAvailability = useMemo(() => {
    return availability.reduce<
      Record<
        string,
        "available" | "reserved" | "tentative" | "maintenance" | "blackout"
      >
    >((acc, item) => {
      acc[item.date] = item.status;
      return acc;
    }, {});
  }, [availability]);

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);
  const selectedDateIsPast = selectedDate ? isPastDate(selectedDate) : false;

  // Dynamic values
  const currentPrice = selectedPackage
    ? selectedPackage.price
    : (overridePrice ?? basePrice);
  const currentUnit = selectedPackage ? selectedPackage.price_unit : priceUnit;

  // Calculate totals
  const guestsToCharge = currentUnit === "per_pax" ? guests : 1;
  const subtotal = currentPrice * guestsToCharge;
  const platformFee = Math.round(subtotal * 0.03); // 3% fee
  const total = subtotal + platformFee;

  // Validate guest counts against package limits
  const activeMinGuests = Number(selectedPackage?.min_guests ?? capacityMin);
  const activeMaxGuests = Number(selectedPackage?.max_guests ?? capacityMax);

  // Check availability when date changes
  useEffect(() => {
    if (!selectedDate) {
      setAvailabilityStatus("idle");
      setOverridePrice(null);
      return;
    }

    if (isPastDate(selectedDate)) {
      setAvailabilityStatus("unavailable");
      setOverridePrice(null);
      return;
    }

    async function checkAvailability() {
      setIsCheckingAvailability(true);
      const dateStr = format(selectedDate!, "yyyy-MM-dd");
      const result = await checkAvailabilityAction({
        venueId,
        date: dateStr,
      });

      setIsCheckingAvailability(false);
      if (result.error) {
        setAvailabilityStatus("unavailable");
      } else {
        setAvailabilityStatus(
          result.data.isAvailable ? "available" : "unavailable",
        );
        setOverridePrice(result.data.priceOverride);
      }
    }

    checkAvailability();
  }, [selectedDate, venueId]);

  // Adjust guests bounds when package selection changes
  useEffect(() => {
    setGuests((prev) => {
      if (prev < activeMinGuests) return activeMinGuests;
      if (prev > activeMaxGuests) return activeMaxGuests;
      return prev;
    });
  }, [selectedPackageId, activeMinGuests, activeMaxGuests]);

  // Keep input value in sync when guests count changes from slider or package bounds
  useEffect(() => {
    setInputValue(guests.toString());
  }, [guests]);

  const handleBook = () => {
    if (
      !selectedDate ||
      selectedDateIsPast ||
      availabilityStatus !== "available"
    )
      return;
    setMobileSheetOpen(false);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const bookingIdentifier = venueSlug || venueId;
    router.push(
      `/venues/${bookingIdentifier}/book?date=${dateStr}&guests=${guests}&packageId=${selectedPackageId}`,
    );
  };

  const getUnitText = (unit: string) => {
    switch (unit) {
      case "per_event":
        return "event";
      case "per_hour":
        return "hour";
      case "per_pax":
        return "guest";
      case "per_day":
      default:
        return "day";
    }
  };

  const bookingForm = (
    <>
      {/* Price section */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="font-sora text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {formatCurrency(currentPrice)}
          </span>
          <span className="text-sm font-medium text-[var(--text-muted)]">
            / {getUnitText(currentUnit)}
          </span>
        </div>
        {overridePrice && (
          <p className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded w-max">
            Peak Price Override Active
          </p>
        )}
      </div>

      <Separator className="my-5" />

      {/* Booking Form Fields */}
      <div className="space-y-4">
        {/* Date Selector */}
        <div className="space-y-1.5 relative">
          <label className="text-[10px] font-bold text-[var(--text-primary)] tracking-wide uppercase">
            Event Date
          </label>
          <button
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full flex items-center justify-between h-11 px-4 border border-[var(--border-default)] bg-[var(--bg-subtle)] rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all"
          >
            <span className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[var(--text-muted)]" />
              {selectedDate
                ? format(selectedDate, "MMMM d, yyyy")
                : "Select date"}
            </span>
            {isCheckingAvailability ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-brand-500)]" />
            ) : (
              availabilityStatus === "available" && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Available
                </span>
              )
            )}
          </button>

          {showCalendar && (
            <div className="absolute top-16 left-0 right-0 z-50 bg-[var(--bg-base)] border border-[var(--border-default)] shadow-2xl rounded-2xl p-2">
              <div className="px-2 pt-2 pb-3 text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
                Choose an available date for your event. Unavailable dates are
                disabled.
              </div>
              <Calendar
                selectedDate={selectedDate as any}
                disablePastDates
                currentMonth={calendarMonth}
                onMonthChange={setCalendarMonth}
                availability={calendarAvailability}
                onDateSelect={(d) => {
                  if (isPastDate(d)) return;
                  setSelectedDate(d);
                  setShowCalendar(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Package Selector */}
        {packages.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-primary)] tracking-wide uppercase">
              Select Package
            </label>
            <Select
              value={selectedPackageId}
              onValueChange={setSelectedPackageId}
            >
              <SelectTrigger
                aria-label="Select Package"
                className="w-full h-11 px-4 border border-[var(--border-default)] bg-[var(--bg-subtle)] rounded-xl text-sm font-medium"
              >
                <SelectValue placeholder="Custom (Base Price)" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[var(--border-default)]">
                <SelectItem value="none" className="text-sm font-medium">
                  Custom (Base Price)
                </SelectItem>
                {packages.map((pkg) => (
                  <SelectItem
                    key={pkg.id}
                    value={pkg.id}
                    className="text-sm font-medium"
                  >
                    {pkg.name} ({formatCurrency(pkg.price)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Guest Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-[var(--text-primary)] tracking-wide uppercase">
              Guests count
            </label>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              Limit: {activeMinGuests}-{activeMaxGuests}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={activeMinGuests}
              max={activeMaxGuests}
              value={
                guests < activeMinGuests
                  ? activeMinGuests
                  : guests > activeMaxGuests
                    ? activeMaxGuests
                    : guests
              }
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full h-1.5 bg-[var(--border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-brand-600)]"
            />
            <input
              type="number"
              aria-label="Guests count"
              value={inputValue}
              onChange={(e) => {
                const valStr = e.target.value;
                setInputValue(valStr);
                const valNum = Number(valStr);
                if (valStr !== "" && !isNaN(valNum)) {
                  setGuests(valNum);
                } else {
                  setGuests(0);
                }
              }}
              className="text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-subtle)] border border-[var(--border-default)] px-2 py-1.5 rounded-xl w-[70px] text-center outline-none focus:border-[var(--color-brand-600)]"
            />
          </div>
          {guests > activeMaxGuests && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-red-500">
              <AlertCircle className="h-3.5 w-3.5" />
              This venue can only accommodate up to {activeMaxGuests} guests.
            </p>
          )}
          {guests < activeMinGuests && (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-red-500">
              <AlertCircle className="h-3.5 w-3.5" />
              This venue requires a minimum of {activeMinGuests} guests.
            </p>
          )}
        </div>
      </div>

      {selectedDate &&
        !isCheckingAvailability &&
        availabilityStatus !== "idle" &&
        (() => {
          const dateStr = format(selectedDate, "yyyy-MM-dd");
          const status = calendarAvailability[dateStr];
          const formattedDate = format(selectedDate, "MMMM d, yyyy");

          let message = "This date is unavailable. Please select another date.";
          let colorClass = "border-red-200 bg-red-50 text-red-600";
          let Icon = AlertCircle;

          if (selectedDateIsPast) {
            message = PAST_DATE_MESSAGE;
          } else if (status === "tentative") {
            message = `${formattedDate} has a pending request and cannot be booked yet.`;
            colorClass = "border-orange-200 bg-orange-50 text-orange-700";
          } else if (status === "reserved") {
            message = `This date is already booked. Please choose another date.`;
          } else if (status === "maintenance") {
            message = `${formattedDate} is unavailable due to maintenance.`;
          } else if (status === "blackout") {
            message = `${formattedDate} is unavailable.`;
          } else if (availabilityStatus === "available") {
            message = `${formattedDate} is available for booking.`;
            colorClass = "border-emerald-200 bg-emerald-50 text-emerald-700";
            Icon = Check;
          }

          return (
            <div
              className={`mt-4 flex gap-2 rounded-xl border p-3 text-xs font-semibold ${colorClass}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          );
        })()}

      {/* Cost Breakdowns */}
      <div className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>
            {formatCurrency(currentPrice)} x {guestsToCharge}{" "}
            {getUnitText(currentUnit)}
            {guestsToCharge > 1 ? "s" : ""}
          </span>
          <span className="font-semibold text-[var(--text-primary)]">
            {formatCurrency(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            Platform Service Fee
            <HelpCircle className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          </span>
          <span className="font-semibold text-[var(--text-primary)]">
            {formatCurrency(platformFee)}
          </span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between text-base font-bold text-[var(--text-primary)]">
          <span>Total Est.</span>
          <span className="text-[var(--color-brand-600)]">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-6 space-y-3">
        <Button
          disabled={
            !selectedDate ||
            selectedDateIsPast ||
            availabilityStatus !== "available" ||
            isCheckingAvailability ||
            guests < activeMinGuests ||
            guests > activeMaxGuests
          }
          onClick={handleBook}
          className="w-full h-12 rounded-2xl font-bold bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] shadow-lg shadow-[var(--color-brand-500)]/20 transition-all flex items-center justify-center gap-2"
        >
          Book This Venue
        </Button>
        {typeof children === "function" ? children(guests) : children}
      </div>

      <div className="mt-4 flex items-center gap-2 justify-center text-xs text-[var(--text-muted)] font-medium">
        <Info className="h-3.5 w-3.5" />
        <span>You won't be charged yet</span>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: sticky sidebar card */}
      <div
        data-testid="venue-booking-sidebar"
        className="sticky top-[9.5rem] hidden w-full rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-slate-200/60 lg:block"
      >
        {bookingForm}
      </div>

      {/* Mobile: Airbnb-style floating bar that reveals the full booking sheet */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-default)] bg-[var(--bg-base)]/95 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.15)] backdrop-blur-lg lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-baseline gap-1">
              <span className="font-sora text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
                {formatCurrency(currentPrice)}
              </span>
              <span className="text-xs font-medium text-[var(--text-muted)]">
                / {getUnitText(currentUnit)}
              </span>
            </div>
            {selectedDate ? (
              <p className="truncate text-[11px] font-medium text-[var(--text-secondary)]">
                {format(selectedDate, "MMM d, yyyy")} - {guests} guest
                {guests !== 1 ? "s" : ""}
              </p>
            ) : (
              <p className="text-[11px] font-medium text-[var(--text-muted)]">
                Add a date to see availability
              </p>
            )}
          </div>

          <Dialog open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 shrink-0 rounded-2xl bg-[var(--color-brand-600)] px-7 font-bold text-white shadow-lg shadow-[var(--color-brand-500)]/20 hover:bg-[var(--color-brand-700)]">
                Reserve
              </Button>
            </DialogTrigger>
            <DialogContent
              className={
                "fixed inset-x-0 bottom-0 left-0 right-0 top-auto z-50 grid max-h-[88vh] w-full max-w-full " +
                "translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-3xl rounded-b-none border-x-0 border-b-0 p-0 " +
                "pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl " +
                "data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out"
              }
            >
              <DialogTitle className="sr-only">Reserve {venueName}</DialogTitle>
              <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-[var(--border-default)]" />
              <div className="px-6 pb-2 pt-4">{bookingForm}</div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
