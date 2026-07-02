"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar as CalendarIcon, Info, HelpCircle, Check, Loader2 } from "lucide-react";
import { Calendar, Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Separator } from "@venora/ui";
import { format } from "date-fns";
import InquiryDialog from "./InquiryDialog";
import { checkAvailabilityAction } from "../application/actions";

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
  venueName: string;
  basePrice: number;
  priceUnit: "per_event" | "per_hour" | "per_pax" | "per_day";
  capacityMin: number;
  capacityMax: number;
  packages: Package[];
}

export default function BookingSidebar({
  venueId,
  venueName,
  basePrice,
  priceUnit,
  capacityMin,
  capacityMax,
  packages = [],
}: BookingSidebarProps) {
  const router = useRouter();

  // State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [guests, setGuests] = useState<number>(capacityMin);
  const [inputValue, setInputValue] = useState<string>(capacityMin.toString());
  const [selectedPackageId, setSelectedPackageId] = useState<string>("none");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<"idle" | "available" | "unavailable">("idle");
  const [overridePrice, setOverridePrice] = useState<number | null>(null);

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  // Dynamic values
  const currentPrice = selectedPackage ? selectedPackage.price : (overridePrice ?? basePrice);
  const currentUnit = selectedPackage ? selectedPackage.price_unit : priceUnit;

  // Calculate totals
  const guestsToCharge = currentUnit === "per_pax" ? guests : 1;
  const subtotal = currentPrice * guestsToCharge;
  const platformFee = Math.round(subtotal * 0.03); // 3% fee
  const total = subtotal + platformFee;

  // Validate guest counts against package limits
  const activeMinGuests = selectedPackage?.min_guests ?? capacityMin;
  const activeMaxGuests = selectedPackage?.max_guests ?? capacityMax;

  // Check availability when date changes
  useEffect(() => {
    if (!selectedDate) {
      setAvailabilityStatus("idle");
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
        setAvailabilityStatus(result.data.isAvailable ? "available" : "unavailable");
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
    if (!selectedDate || availabilityStatus !== "available") return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    router.push(
      `/venues/${venueId}/book?date=${dateStr}&guests=${guests}&packageId=${selectedPackageId}`
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

  return (
    <div className="glass border border-[var(--border-default)] rounded-3xl p-6 shadow-2xl sticky top-24 w-full">
      {/* Price section */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="font-sora text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            ₱{currentPrice.toLocaleString()}
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
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select date"}
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
              <Calendar
                selectedDate={selectedDate as any}
                onDateSelect={(d) => {
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
            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
              <SelectTrigger className="w-full h-11 px-4 border border-[var(--border-default)] bg-[var(--bg-subtle)] rounded-xl text-sm font-medium">
                <SelectValue placeholder="Custom (Base Price)" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[var(--border-default)]">
                <SelectItem value="none" className="text-sm font-medium">Custom (Base Price)</SelectItem>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id} className="text-sm font-medium">
                    {pkg.name} (₱{pkg.price.toLocaleString()})
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
              value={guests < activeMinGuests ? activeMinGuests : guests > activeMaxGuests ? activeMaxGuests : guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full h-1.5 bg-[var(--border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--color-brand-600)]"
            />
            <input
              type="number"
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
            <p className="text-red-500 text-[11px] font-semibold mt-1">
              ⚠️ This venue can only accommodate up to {activeMaxGuests} guests.
            </p>
          )}
          {guests < activeMinGuests && (
            <p className="text-red-500 text-[11px] font-semibold mt-1">
              ⚠️ This venue requires a minimum of {activeMinGuests} guests.
            </p>
          )}
        </div>
      </div>

      {availabilityStatus === "unavailable" && selectedDate && (
        <div className="mt-4 p-3 rounded-xl border border-red-200/20 bg-red-500/10 text-red-600 text-xs font-medium">
          ⚠️ This date is unavailable. Please select another date.
        </div>
      )}

      {/* Cost Breakdowns */}
      <div className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>
            ₱{currentPrice.toLocaleString()} × {guestsToCharge} {getUnitText(currentUnit)}
            {guestsToCharge > 1 ? "s" : ""}
          </span>
          <span className="font-semibold text-[var(--text-primary)]">
            ₱{subtotal.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            Platform Service Fee
            <HelpCircle className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          </span>
          <span className="font-semibold text-[var(--text-primary)]">
            ₱{platformFee.toLocaleString()}
          </span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between text-base font-bold text-[var(--text-primary)]">
          <span>Total Est.</span>
          <span className="text-[var(--color-brand-600)]">
            ₱{total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-6 space-y-3">
        <Button
          disabled={
            !selectedDate ||
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

        <InquiryDialog venueId={venueId} venueName={venueName} />
      </div>

      <div className="mt-4 flex items-center gap-2 justify-center text-xs text-[var(--text-muted)] font-medium">
        <Info className="h-3.5 w-3.5" />
        <span>You won't be charged yet</span>
      </div>
    </div>
  );
}
