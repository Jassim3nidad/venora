"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Building2,
  CalendarDays,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  TicketCheck,
  Users,
} from "lucide-react";
import { createSupplierContactRequestAction } from "../application/actions";
import type { CustomerBookingOption } from "../application/get-customer-bookings-for-contact";
import type {
  SupplierMarketplaceProfile,
  SupplierPackage,
} from "../types/supplier.types";
import { formatPriceUnit, formatSupplierPrice } from "../utils/supplier-format";

type SupplierContactFormProps = {
  supplier: SupplierMarketplaceProfile;
  supplierSlug?: string | null;
  userEmail?: string | null;
  bookings?: CustomerBookingOption[];
};

function packageLabel(pkg: SupplierPackage) {
  const price = formatSupplierPrice(pkg.price);
  const unit = formatPriceUnit(pkg.priceUnit);
  return `${pkg.name}${pkg.price ? ` - ${price}${unit ? ` ${unit}` : ""}` : ""}`;
}

export function SupplierContactForm({
  supplier,
  supplierSlug,
  userEmail,
  bookings = [],
}: SupplierContactFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedPackageId, setSelectedPackageId] = useState(
    supplier.packages.find((pkg) => pkg.isActive)?.id ?? "",
  );
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
    requestId?: string;
  } | null>(null);
  const activePackages = useMemo(
    () => supplier.packages.filter((pkg) => pkg.isActive),
    [supplier.packages],
  );

  const approvedBookings = useMemo(
    () =>
      bookings.filter(
        (b) => b.status === "approved" || b.status === "confirmed",
      ),
    [bookings],
  );
  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "pending"),
    [bookings],
  );

  const hasApprovedBookings = approvedBookings.length > 0;
  const hasOnlyPendingBookings =
    !hasApprovedBookings && pendingBookings.length > 0;

  const handleBookingChange = (bookingId: string) => {
    setSelectedBookingId(bookingId);

    const booking = approvedBookings.find((item) => item.id === bookingId);
    if (!booking) {
      setEventDate("");
      setGuestCount("");
      return;
    }

    setEventDate(booking.eventDate ?? "");
    setGuestCount(
      typeof booking.guestCount === "number" ? String(booking.guestCount) : "",
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      supplierId: supplier.id,
      serviceId: selectedPackageId || undefined,
      bookingId: selectedBookingId || undefined,
      contactName: String(formData.get("contactName") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      eventDate,
      guestCount: Number(guestCount) || undefined,
      message: String(formData.get("message") ?? ""),
    };

    startTransition(async () => {
      const result = await createSupplierContactRequestAction(payload);
      if (result.error) {
        setStatus({ type: "error", message: result.error.message });
        return;
      }

      form.reset();
      setSelectedPackageId(activePackages[0]?.id ?? "");
      setSelectedBookingId("");
      setEventDate("");
      setGuestCount("");
      setStatus({
        type: "success",
        message:
          "Inquiry sent. The supplier can now follow up from their dashboard.",
        requestId: result.data?.requestId,
      });
    });
  };

  // Not logged in
  if (!userEmail) {
    const redirectTo = supplierSlug
      ? `/login?redirectTo=/suppliers/${supplierSlug}`
      : "/login";
    return (
      <div className="min-w-0 rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5">
        <h2 className="text-lg font-bold text-[#111827]">Send Inquiry</h2>
        <p className="mt-2 break-words text-sm font-medium leading-6 text-[#6B7280]">
          Sign in as a customer to send an inquiry and keep supplier
          conversations tied to your Venora account.
        </p>
        <a
          href={redirectTo}
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-5 text-sm font-bold text-white transition hover:bg-[#1D4ED8] sm:w-auto"
        >
          Sign in to continue
        </a>
      </div>
    );
  }

  // Logged in but no approved bookings — block the form entirely
  if (!hasApprovedBookings) {
    return (
      <div className="min-w-0 rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5">
        <h2 className="text-lg font-bold text-[#111827]">Send Inquiry</h2>

        <div className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <TicketCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                Approved venue booking required
              </p>
              {hasOnlyPendingBookings ? (
                <p className="mt-1 text-sm font-medium leading-6 text-amber-700">
                  You have pending venue bookings. Pending venue bookings cannot
                  be used as confirmed event locations yet. Please wait for the
                  venue owner to approve your booking first.
                </p>
              ) : (
                <p className="mt-1 text-sm font-medium leading-6 text-amber-700">
                  You need an approved venue booking before you can link an
                  event location to this supplier inquiry. Browse venues to book
                  first.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {!hasOnlyPendingBookings && (
              <Link
                href="/venues"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 text-sm font-bold text-white transition hover:bg-[#1D4ED8]"
              >
                <Building2 className="h-4 w-4" />
                Browse Venues
              </Link>
            )}
            <Link
              href="/bookings"
              className={
                hasOnlyPendingBookings
                  ? "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 text-sm font-bold text-white transition hover:bg-[#1D4ED8]"
                  : "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
              }
            >
              <TicketCheck className="h-4 w-4" />
              View My Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5"
    >
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#111827]">Send Inquiry</h2>
        <p className="mt-1 text-sm font-medium text-[#6B7280]">
          Sent from {userEmail}
        </p>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-500">Package</span>
          <select
            value={selectedPackageId}
            onChange={(event) => setSelectedPackageId(event.target.value)}
            className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
          >
            <option value="">General inquiry</option>
            {activePackages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {packageLabel(pkg)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-500">Name</span>
          <input
            name="contactName"
            required
            minLength={2}
            className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-slate-500">Email</span>
            <span className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="contactEmail"
                type="email"
                defaultValue={userEmail}
                required
                className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-slate-500">Phone</span>
            <span className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="contactPhone"
                type="tel"
                className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </span>
          </label>
        </div>

        {/* Approved venue booking selector — required */}
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-500">
            Event location (approved booking){" "}
            <span className="text-red-500">*</span>
          </span>
          <span className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              name="bookingId"
              required
              value={selectedBookingId}
              onChange={(event) => handleBookingChange(event.target.value)}
              className="h-11 w-full appearance-none rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
            >
              <option value="">Select approved booking</option>
              {approvedBookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.label}
                </option>
              ))}
            </select>
          </span>
          <p className="text-[11px] font-medium text-slate-400">
            Only your approved venue bookings are shown.
          </p>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-slate-500">Event date</span>
            <span className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="eventDate"
                type="date"
                value={eventDate}
                readOnly
                placeholder="Auto-filled from booking"
                className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-slate-500">Guests</span>
            <span className="relative">
              <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="guestCount"
                type="number"
                min="1"
                value={guestCount}
                readOnly
                placeholder="Auto-filled from booking"
                inputMode="numeric"
                className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </span>
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-500">Message</span>
          <span className="relative">
            <MessageSquare className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <textarea
              name="message"
              required
              minLength={10}
              rows={5}
              placeholder="Describe the service you need, your event type, and any special requirements."
              className="w-full resize-none rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] py-3 pl-9 pr-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </span>
        </label>
      </div>

      {status ? (
        <div
          role={status.type === "error" ? "alert" : "status"}
          className={[
            "mt-4 rounded-2xl border px-3 py-2 text-sm font-semibold",
            status.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          <p>{status.message}</p>
          {status.type === "success" ? (
            <Link
              href={
                status.requestId
                  ? `/inquiries/${status.requestId}`
                  : "/bookings?view=suppliers"
              }
              className="mt-2 inline-flex font-bold text-emerald-800 underline-offset-4 hover:underline"
            >
              View Inquiry
            </Link>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 text-sm font-bold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Send Inquiry
      </button>
    </form>
  );
}
