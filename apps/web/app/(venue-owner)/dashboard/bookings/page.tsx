import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CreditCard, TicketCheck, Users } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import {
  DashboardSubPage,
  DashButton,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import {
  OwnerBookingDecisionForm,
  OwnerCompleteBookingButton,
} from "@/src/features/booking/ui/booking-action-controls";

export const metadata: Metadata = { title: "Bookings - Dashboard" };
export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  event_date: string;
  event_start_time: string | null;
  event_end_time: string | null;
  status: string;
  total_amount: number | null;
  deposit_amount: number | null;
  guest_count: number;
  special_requests: string | null;
  payment_due_at: string | null;
  venues: { name: string; base_price: number | null } | null;
  venue_packages: { name: string; price: number; price_unit: string } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "-";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function summaryCount(bookings: BookingRow[], statuses: string[]) {
  return bookings.filter((booking) => statuses.includes(booking.status)).length;
}

export default async function OwnerBookingsPage() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);
  const orgIds = (members ?? []).map((m: { organization_id: string }) => m.organization_id);

  const { data: venues } = await supabase
    .from("venues")
    .select("id")
    .in("organization_id", orgIds.length ? orgIds : ["__none__"]);
  const venueIds = (venues ?? []).map((v: { id: string }) => v.id);

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `
      id,
      event_date,
      event_start_time,
      event_end_time,
      status,
      total_amount,
      deposit_amount,
      guest_count,
      special_requests,
      payment_due_at,
      venues(name, base_price),
      venue_packages(name, price, price_unit),
      profiles!customer_id(full_name, phone)
    `,
    )
    .in("venue_id", venueIds.length ? venueIds : ["__none__"])
    .order("created_at", { ascending: false });

  const rows = (bookings ?? []) as BookingRow[];

  return (
    <DashboardSubPage
      title="Bookings"
      description="Approve inquiries, monitor deposits, confirm paid events, and close completed bookings."
      action={<DashButton href="/dashboard/calendar" variant="secondary" icon="event">Calendar</DashButton>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Pending", summaryCount(rows, ["pending"]), "New inquiries", TicketCheck],
          ["Payment", summaryCount(rows, ["approved", "payment_pending"]), "Awaiting deposits", CreditCard],
          ["Confirmed", summaryCount(rows, ["confirmed"]), "Paid bookings", CalendarDays],
          ["Completed", summaryCount(rows, ["completed", "reviewed"]), "Closed events", Users],
        ].map(([label, value, caption, Icon]) => {
          const KpiIcon = Icon as typeof TicketCheck;
          return (
            <div key={label as string} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
                    {caption as string}
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#111827]">{value as number}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1D4ED8]">
                  <KpiIcon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-sm font-bold text-[#1D4ED8]">{label as string}</p>
            </div>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-14 text-center text-sm font-semibold text-[#4B5563]">
          No bookings found for your venues.
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((booking) => {
            const suggestedTotal =
              booking.total_amount ??
              booking.venue_packages?.price ??
              booking.venues?.base_price ??
              0;
            const suggestedDeposit = booking.deposit_amount ?? Math.round(suggestedTotal * 0.5);

            return (
              <article key={booking.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <StatusBadge status={booking.status} />
                        <h2 className="mt-3 text-xl font-black tracking-[-0.03em] text-[#111827]">
                          {booking.venues?.name ?? "Venue booking"}
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-[#4B5563]">
                          {booking.profiles?.full_name ?? "Customer"} - {booking.guest_count.toLocaleString("en-PH")} guests
                        </p>
                      </div>

                      <Link
                        href={`/dashboard/bookings/${booking.id}`}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-bold text-[#111827] transition hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
                      >
                        Details
                      </Link>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">Date</p>
                        <p className="mt-1 text-sm font-black text-[#111827]">{formatDate(booking.event_date)}</p>
                      </div>
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">Quote</p>
                        <p className="mt-1 text-sm font-black text-[#111827]">{formatCurrency(booking.total_amount)}</p>
                      </div>
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">Deposit</p>
                        <p className="mt-1 text-sm font-black text-[#111827]">{formatCurrency(booking.deposit_amount)}</p>
                      </div>
                    </div>

                    {booking.special_requests ? (
                      <p className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-medium leading-6 text-[#4B5563]">
                        {booking.special_requests}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    {booking.status === "pending" ? (
                      <OwnerBookingDecisionForm
                        bookingId={booking.id}
                        suggestedTotal={suggestedTotal}
                        suggestedDeposit={suggestedDeposit}
                      />
                    ) : booking.status === "confirmed" ? (
                      <OwnerCompleteBookingButton bookingId={booking.id} />
                    ) : (
                      <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-semibold text-[#4B5563]">
                        No owner action is required for this status.
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </DashboardSubPage>
  );
}
