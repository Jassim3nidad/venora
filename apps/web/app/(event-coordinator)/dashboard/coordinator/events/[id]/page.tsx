import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  MessageSquareText,
  Users,
} from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import {
  DashboardSubPage,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import {
  OwnerBookingDecisionForm,
  OwnerCompleteBookingButton,
} from "@/src/features/booking/ui/booking-action-controls";
import { getBookingMessages } from "@/src/features/booking/application/messages-actions";
import { BookingConversation } from "@/src/features/booking/ui/BookingConversation";

export const metadata: Metadata = {
  title: "Event Detail - Coordinator Dashboard",
};
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

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
  venues: {
    id: string;
    name: string;
    base_price: number | null;
    organization_id: string;
  } | null;
  venue_packages: { name: string; price: number; price_unit: string } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
  transactions: Array<{
    id: string;
    amount: number;
    payment_provider: string;
    provider_reference: string | null;
    status: string;
    created_at: string;
    paid_at: string | null;
  }> | null;
  booking_status_history: Array<{
    status: string;
    note: string | null;
    created_at: string;
  }> | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: value.includes("T") ? "medium" : "long",
    ...(value.includes("T") ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

function locationLabel(venue: any) {
  if (!venue) return "Location unavailable";
  if (venue.city && venue.province) return `${venue.city}, ${venue.province}`;
  return venue.city || venue.province || "Location unavailable";
}

function formatCurrency(value?: number | null) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "-";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default async function CoordinatorEventDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: booking } = await supabase
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
      venues(id, name, base_price, organization_id),
      venue_packages(name, price, price_unit),
      profiles!customer_id(full_name, phone),
      transactions(
        id,
        amount,
        payment_provider,
        provider_reference,
        status,
        created_at,
        paid_at
      ),
      booking_status_history(
        status,
        note,
        created_at
      )
    `,
    )
    .eq("id", id)
    .single();

  if (!booking) notFound();
  const typedBooking = booking as BookingRow;

  const organizationId = typedBooking.venues?.organization_id;
  if (!organizationId) redirect("/unauthorized");

  const [{ data: roles }, { data: membership }, { data: organization }] =
    await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .maybeSingle(),
      supabase
        .from("organizations")
        .select("id")
        .eq("id", organizationId)
        .eq("owner_id", user.id)
        .maybeSingle(),
    ]);

  const isAdmin = (roles ?? []).some(
    (row: { role: string }) => row.role === "admin",
  );

  if (!isAdmin && !membership && !organization) redirect("/unauthorized");

  const suggestedTotal =
    typedBooking.total_amount ??
    typedBooking.venue_packages?.price ??
    typedBooking.venues?.base_price ??
    0;
  const suggestedDeposit =
    typedBooking.deposit_amount ?? Math.round(suggestedTotal * 0.5);

  const MESSAGING_ALLOWED = new Set([
    "pending",
    "approved",
    "payment_pending",
    "confirmed",
  ]);
  const isReadOnly = !MESSAGING_ALLOWED.has(typedBooking.status);

  const messages = await getBookingMessages(id);

  return (
    <DashboardSubPage
      title={typedBooking.venues?.name ?? "Event detail"}
      description={`${typedBooking.profiles?.full_name ?? "Customer"} - ${formatDate(typedBooking.event_date)}`}
      action={
        <Link
          href="/dashboard/coordinator/events"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a] shadow-sm shadow-slate-200/60 transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="grid gap-5">
          <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <StatusBadge status={typedBooking.status} />
                <h2 className="mt-3 text-2xl font-black tracking-tight text-[#0f172a]">
                  Event booking request
                </h2>
              </div>
              <p className="break-all text-xs font-bold text-[#64748b]">
                {typedBooking.id}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Event", formatDate(typedBooking.event_date), CalendarDays],
                [
                  "Guests",
                  typedBooking.guest_count.toLocaleString("en-PH"),
                  Users,
                ],
                [
                  "Quote",
                  formatCurrency(typedBooking.total_amount),
                  CreditCard,
                ],
                [
                  "Deposit",
                  formatCurrency(typedBooking.deposit_amount),
                  CreditCard,
                ],
              ].map(([label, value, Icon]) => {
                const DetailIcon = Icon as typeof CalendarDays;
                return (
                  <div
                    key={label as string}
                    className="rounded-2xl border border-[#e5e7eb] bg-[#f8fbff] p-4 shadow-sm shadow-slate-200/60"
                  >
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                      <DetailIcon className="h-3.5 w-3.5 text-[#1d4ed8]" />
                      {label as string}
                    </div>
                    <p className="mt-2 text-sm font-black text-[#0f172a]">
                      {value as string}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-[#0f172a]">
              <MessageSquareText className="h-5 w-5 text-[#1d4ed8]" />
              Notes
            </h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fbff] p-4">
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                  Customer inquiry
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-[#475569]">
                  {typedBooking.special_requests || "No inquiry note."}
                </p>
              </div>
              <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fbff] p-4">
                <p className="text-xs font-extrabold uppercase tracking-wide text-[#64748b]">
                  Venue response
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-[#475569]">
                  {"No response yet."}
                </p>
              </div>
            </div>
          </section>

          {/* Booking Conversation */}
          <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-[#0f172a]">
                Customer Communication
              </h2>
              {isReadOnly && (
                <span className="rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#64748b]">
                  Read-only
                </span>
              )}
            </div>
            <BookingConversation
              bookingId={typedBooking.id}
              initialMessages={messages}
              currentUserId={user.id}
              currentRole="venue_owner"
              isReadOnly={isReadOnly}
              header={{
                role: "supplier",
                customerName: typedBooking.profiles?.full_name || "Customer",
                serviceName: typedBooking.venue_packages?.name,
                inquiryRef: `Booking #${typedBooking.id.substring(0, 8)}`,
                eventType: "Event",
                eventDate: formatDate(typedBooking.event_date),
                venueName: locationLabel(typedBooking.venues),
                venueLink: `/venues/${(typedBooking.venues as any)?.slug}`,
                statusLabel: String(typedBooking.status).replace(/_/g, " "),
              }}
            />
          </section>

          <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
            <h2 className="text-xl font-black tracking-tight text-[#0f172a]">
              Status history
            </h2>
            <div className="mt-5 grid gap-0">
              {(typedBooking.booking_status_history ?? []).map((item) => (
                <div
                  key={`${item.status}-${item.created_at}`}
                  className="flex gap-3 border-l border-[#dbeafe] pb-5 last:border-transparent last:pb-0"
                >
                  <span className="-ml-[13px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-xs font-black text-white" />
                  <div>
                    <p className="text-sm font-black capitalize text-[#0f172a]">
                      {item.status.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#64748b]">
                      {formatDate(item.created_at)}
                    </p>
                    {item.note ? (
                      <p className="mt-2 text-sm text-[#475569]">{item.note}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="grid gap-5 xl:sticky xl:top-24">
          <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
            <h2 className="text-xl font-black tracking-tight text-[#0f172a]">
              Coordinator action
            </h2>
            <div className="mt-4">
              {typedBooking.status === "pending" ? (
                <OwnerBookingDecisionForm
                  bookingId={typedBooking.id}
                  suggestedTotal={suggestedTotal}
                  suggestedDeposit={suggestedDeposit}
                />
              ) : typedBooking.status === "confirmed" ? (
                <OwnerCompleteBookingButton bookingId={typedBooking.id} />
              ) : (
                <p className="rounded-2xl border border-[#e5e7eb] bg-[#f8fbff] p-4 text-sm font-semibold text-[#475569]">
                  No coordinator action is required for this status.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
            <h2 className="text-xl font-black tracking-tight text-[#0f172a]">
              Transactions
            </h2>
            <div className="mt-4 grid gap-3">
              {(typedBooking.transactions ?? []).length > 0 ? (
                typedBooking.transactions?.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-2xl border border-[#e5e7eb] bg-[#f8fbff] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-[#0f172a]">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <StatusBadge status={transaction.status} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-[#64748b]">
                      {transaction.payment_provider.toUpperCase()} -{" "}
                      {formatDate(
                        transaction.paid_at ?? transaction.created_at,
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4 text-sm font-semibold text-[#475569]">
                  No transactions yet.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </DashboardSubPage>
  );
}
