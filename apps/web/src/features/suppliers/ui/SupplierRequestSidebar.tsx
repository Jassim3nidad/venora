"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Info,
  Loader2,
  TicketCheck,
  Users,
  MessageSquare,
  MapPin,
} from "lucide-react";
import {
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
  Toast,
  ToastTitle,
  ToastDescription,
} from "@venora/ui";
import { createSupplierContactRequestAction } from "../application/actions";
import type { CustomerBookingOption } from "../application/get-customer-bookings-for-contact";
import type { SupplierMarketplaceProfile } from "../types/supplier.types";
import { formatSupplierPrice } from "../utils/supplier-format";
import { getSupplierStartingPrice } from "../utils/supplier-derive";

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

type SupplierRequestSidebarProps = {
  supplier: SupplierMarketplaceProfile;
  supplierSlug?: string | null;
  userEmail?: string | null | undefined;
  bookings?: CustomerBookingOption[];
  isOwner?: boolean;
};

export function SupplierRequestSidebar({
  supplier,
  supplierSlug,
  userEmail,
  bookings = [],
  isOwner = false,
}: SupplierRequestSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [selectedPackageId, setSelectedPackageId] = useState(
    supplier.packages.find((pkg) => pkg.isActive)?.id ?? "",
  );

  useEffect(() => {
    const handleSelectService = (e: Event) => {
      const customEvent = e as CustomEvent<{ serviceId: string }>;
      if (customEvent.detail?.serviceId) {
        setSelectedPackageId(customEvent.detail.serviceId);
      }
    };
    window.addEventListener("venora:select-service", handleSelectService);
    return () =>
      window.removeEventListener("venora:select-service", handleSelectService);
  }, []);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    title: "",
    description: "",
    type: "default" as "default" | "success" | "error",
  });

  const activePackages = useMemo(
    () => supplier.packages.filter((pkg) => pkg.isActive),
    [supplier.packages],
  );

  const approvedBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.status === "approved" ||
          b.status === "confirmed" ||
          b.status === "paid",
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

  const startingPrice = getSupplierStartingPrice(supplier);
  const formattedStartingPrice = startingPrice
    ? formatSupplierPrice(startingPrice)
    : null;

  const selectedBooking = useMemo(
    () => approvedBookings.find((b) => b.id === selectedBookingId),
    [approvedBookings, selectedBookingId],
  );

  const eventDistanceKm = useMemo(() => {
    if (
      !selectedBooking ||
      selectedBooking.latitude == null ||
      selectedBooking.longitude == null ||
      supplier.latitude == null ||
      supplier.longitude == null
    ) {
      return null;
    }
    return calculateDistanceKm(
      supplier.latitude,
      supplier.longitude,
      selectedBooking.latitude,
      selectedBooking.longitude,
    );
  }, [selectedBooking, supplier]);

  const isOutsideCoverage =
    eventDistanceKm != null &&
    supplier.coverageRadiusKm != null &&
    eventDistanceKm > supplier.coverageRadiusKm;

  const triggerToast = (
    title: string,
    description: string,
    type: "default" | "success" | "error" = "default",
  ) => {
    setToastMessage({ title, description, type });
    setToastOpen(true);
  };

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
    if (!hasApprovedBookings) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      supplierId: supplier.id,
      serviceId: selectedPackageId || undefined,
      bookingId: selectedBookingId || undefined,
      contactName: "", // Server uses auth
      contactEmail: "", // Server uses auth
      contactPhone: "", // Server uses auth
      eventDate,
      guestCount: Number(guestCount) || undefined,
      message: String(formData.get("message") ?? ""),
    };

    startTransition(async () => {
      const result = await createSupplierContactRequestAction(payload);
      if (result.error) {
        triggerToast("Request Failed", result.error.message, "error");
        return;
      }

      form.reset();
      setSelectedPackageId(activePackages[0]?.id ?? "");
      setSelectedBookingId("");
      setEventDate("");
      setGuestCount("");
      setIsExpanded(false);
      triggerToast(
        "Request Sent",
        "Your proposal request has been sent to the supplier. You can view it in your dashboard.",
        "success",
      );
    });
  };

  // 1. Logged out state
  if (!userEmail) {
    const redirectTo = supplierSlug
      ? `/login?redirectTo=/suppliers/${supplierSlug}`
      : "/login";

    return (
      <div
        className="w-full min-w-0 rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-lg shadow-slate-200/40"
        id="supplier-request-card"
      >
        <div className="mb-4 flex flex-col gap-0.5">
          <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#6B7280]">
            Starting at
          </span>
          {formattedStartingPrice ? (
            <p className="text-xl font-bold tracking-tight text-[#111827]">
              {formattedStartingPrice}
              <span className="ml-1.5 text-sm font-semibold tracking-normal text-[#6B7280]">
                per event
              </span>
            </p>
          ) : (
            <p className="text-xl font-bold text-[#4B5563]">
              Contact supplier for pricing
            </p>
          )}
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#111827]">
            Request a Service Proposal
          </h2>
          <p className="mt-1 break-words text-sm font-medium leading-relaxed text-[#4B5563]">
            Sign in to request a Service Proposal and connect it to your event
            bookings.
          </p>
        </div>

        <Button
          asChild
          className="h-11 w-full rounded-2xl font-bold bg-[#2563EB] hover:bg-[#1D4ED8]"
        >
          <Link href={redirectTo}>Sign in to Request Proposal</Link>
        </Button>
      </div>
    );
  }

  // 2. Owner viewing their own listing
  if (isOwner) {
    return (
      <div
        className="w-full min-w-0 rounded-[24px] border border-indigo-200 bg-indigo-50/50 p-5 shadow-lg shadow-indigo-100/40"
        id="supplier-request-card"
      >
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-indigo-900">
            This is your supplier listing
          </h2>
        </div>
        <p className="mb-5 break-words text-sm font-medium leading-6 text-indigo-800">
          You are viewing your business as customers see it. Customers will use
          this card to request a service proposal.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            asChild
            className="h-11 w-full rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700"
          >
            <Link href="/dashboard/supplier">Enter Supplier Dashboard</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 w-full rounded-2xl font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
          >
            <Link href="/dashboard/supplier/inquiries">View Inquiries</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 3. Logged in, default unexpanded state
  if (!isExpanded) {
    return (
      <div
        className="w-full min-w-0 rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-lg shadow-slate-200/40 transition-all"
        id="supplier-request-card"
      >
        <div className="mb-4 flex flex-col gap-0.5">
          <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#6B7280]">
            Starting at
          </span>
          {formattedStartingPrice ? (
            <p className="text-xl font-bold tracking-tight text-[#111827]">
              {formattedStartingPrice}
              <span className="ml-1.5 text-sm font-semibold tracking-normal text-[#6B7280]">
                per event
              </span>
            </p>
          ) : (
            <p className="text-xl font-bold text-[#4B5563]">
              Contact supplier for pricing
            </p>
          )}
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#111827]">
            Request a Service Proposal
          </h2>
          <p className="mt-1 break-words text-sm font-medium leading-relaxed text-[#4B5563]">
            Choose a service and connect it to your approved event booking.
          </p>
        </div>

        <div className="mb-5 flex flex-col gap-2">
          {supplier.responseTimeHours ? (
            <div className="flex items-center gap-2.5 text-sm font-medium text-[#4B5563]">
              <MessageSquare className="h-4 w-4 text-[#2563EB]" />
              Responds within {supplier.responseTimeHours}{" "}
              {supplier.responseTimeHours === 1 ? "hour" : "hours"}
            </div>
          ) : null}
          {supplier.minimumBookingNoticeDays ? (
            <div className="flex items-center gap-2.5 text-sm font-medium text-[#4B5563]">
              <CalendarDays className="h-4 w-4 text-[#2563EB]" />
              {supplier.minimumBookingNoticeDays}-day minimum notice
            </div>
          ) : null}
        </div>

        <Button
          onClick={() => setIsExpanded(true)}
          className="h-11 w-full rounded-2xl bg-[#2563EB] text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition-all hover:-translate-y-0.5 hover:bg-[#1D4ED8] hover:shadow-md hover:shadow-[#2563EB]/30"
        >
          Request Proposal
        </Button>

        {toastOpen && (
          <Toast
            open={toastOpen}
            onOpenChange={setToastOpen}
            variant={toastMessage.type === "error" ? "destructive" : "default"}
          >
            <div className="grid gap-1">
              {toastMessage.title && (
                <ToastTitle>{toastMessage.title}</ToastTitle>
              )}
              {toastMessage.description && (
                <ToastDescription>{toastMessage.description}</ToastDescription>
              )}
            </div>
          </Toast>
        )}
      </div>
    );
  }

  // 4. Logged in, expanded state, but no eligible bookings
  if (!hasApprovedBookings) {
    return (
      <div
        className="w-full min-w-0 rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-lg shadow-slate-200/40"
        id="supplier-request-card"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#111827]">
            Request Proposal
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-xs font-bold text-[#6B7280] hover:text-[#111827]"
          >
            Cancel
          </Button>
        </div>

        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5">
          <div className="flex flex-col gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <TicketCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                An approved venue booking is required
              </p>
              <p className="mt-1 text-xs font-medium text-amber-800">
                Supplier requests are connected to approved event details so
                suppliers can prepare an accurate Service Proposal.
              </p>
              {hasOnlyPendingBookings ? (
                <p className="mt-2 text-xs font-bold text-amber-900">
                  You have pending bookings. Please wait for the venue to
                  approve them.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            asChild
            className="h-11 w-full rounded-2xl bg-[#111827] font-bold text-white hover:bg-[#374151]"
          >
            <Link href="/venues">Browse Venues</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 w-full rounded-2xl font-bold"
          >
            <Link href="/bookings?view=venues">View My Bookings</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 5. Logged in, expanded state, ready to fill request
  return (
    <div
      className="w-full min-w-0 flex flex-col max-h-[calc(100vh-11rem)] rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-lg shadow-slate-200/40"
      id="supplier-request-card"
    >
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <h2 className="text-xl font-bold text-[#111827]">Request Proposal</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
          className="text-xs font-bold text-[#6B7280] hover:text-[#111827]"
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto pr-2 pb-2">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="service-select"
            className="text-xs font-bold leading-normal text-[#4B5563] pb-1"
          >
            Step 1: Choose a Service
          </label>
          <Select
            value={selectedPackageId}
            onValueChange={setSelectedPackageId}
            required
          >
            <SelectTrigger
              id="service-select"
              className="h-11 rounded-xl bg-white"
            >
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {activePackages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name}{" "}
                  {pkg.price ? `— ${formatSupplierPrice(pkg.price)}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="booking-select"
            className="text-xs font-bold leading-normal text-[#4B5563] pb-1"
          >
            Step 2: Select Your Event
          </label>
          <Select
            value={selectedBookingId}
            onValueChange={handleBookingChange}
            required
          >
            <SelectTrigger
              id="booking-select"
              className="h-11 rounded-xl bg-white"
            >
              <SelectValue placeholder="Select an approved booking" />
            </SelectTrigger>
            <SelectContent>
              {approvedBookings.map((booking) => (
                <SelectItem key={booking.id} value={booking.id}>
                  {booking.venueName || "Event"} —{" "}
                  {booking.eventDate || "Date TBD"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedBookingId && eventDate && (
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3 text-sm">
            <div className="flex items-center gap-2 text-[#4B5563]">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{eventDate}</span>
            </div>
            {guestCount && (
              <div className="mt-2 flex items-center gap-2 text-[#4B5563]">
                <Users className="h-4 w-4 shrink-0" />
                <span className="font-semibold">{guestCount} guests</span>
              </div>
            )}
            {eventDistanceKm != null && (
              <div
                className={`mt-3 flex flex-col gap-1 rounded-lg p-3 ${isOutsideCoverage ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-slate-100 text-[#4B5563]"}`}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-semibold text-sm">
                    {eventDistanceKm} km from supplier base
                  </span>
                </div>
                {isOutsideCoverage && (
                  <p className="text-xs font-semibold ml-6 text-amber-700">
                    This venue is outside the {supplier.coverageRadiusKm} km
                    coverage radius. Travel fees may apply.
                  </p>
                )}
              </div>
            )}
            <input type="hidden" name="eventDate" value={eventDate} />
            <input type="hidden" name="guestCount" value={guestCount} />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label
            htmlFor="message-input"
            className="text-xs font-bold leading-normal text-[#4B5563] pb-1"
          >
            Step 3: Tell the supplier what you need
          </label>
          <textarea
            id="message-input"
            name="message"
            required
            rows={4}
            className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm outline-none focus:outline-none focus-visible:outline-none"
            placeholder="Describe your preferred style, expected coverage, important deliverables, and special event requirements."
          />
        </div>

        <Separator className="my-4" />

        <Button
          type="submit"
          disabled={isPending || !selectedBookingId || !selectedPackageId}
          className="h-14 shrink-0 w-full rounded-2xl bg-[#2563EB] text-sm font-bold text-white shadow-sm transition hover:bg-[#1D4ED8] hover:shadow-md"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? "Sending Request..." : "Submit Request"}
        </Button>
      </form>

      {toastOpen && (
        <Toast
          open={toastOpen}
          onOpenChange={setToastOpen}
          variant={toastMessage.type === "error" ? "destructive" : "default"}
        >
          <div className="grid gap-1">
            {toastMessage.title && (
              <ToastTitle>{toastMessage.title}</ToastTitle>
            )}
            {toastMessage.description && (
              <ToastDescription>{toastMessage.description}</ToastDescription>
            )}
          </div>
        </Toast>
      )}
    </div>
  );
}
