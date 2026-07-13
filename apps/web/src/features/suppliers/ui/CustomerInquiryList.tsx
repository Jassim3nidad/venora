import Link from "next/link";
import {
  CalendarDays,
  FilterX,
  Mail,
  MapPin,
  Search,
  SlidersHorizontal,
  Store,
  TicketCheck,
} from "lucide-react";
import {
  CustomerCard,
  CustomerEmptyState,
  CustomerLinkButton,
} from "@/src/components/customer/CustomerUI";
import {
  filterCustomerInquiries,
  getCustomerInquiryStats,
  getInquiryDisplayStatus,
  getLastInquiryActivityAt,
  getPrimaryQuoteStatus,
  type CustomerInquirySort,
  type CustomerInquiryTone,
} from "../application/customer-inquiry.logic";

type CustomerInquiryListProps = {
  inquiries: any[];
  query?: {
    q?: string;
    status?: string;
    proposal?: string;
    sort?: string;
  };
};

const inquiryStatuses = [
  { value: "all", label: "All inquiries" },
  { value: "new", label: "Pending" },
  { value: "responded", label: "Responded" },
  { value: "closed", label: "Completed" },
];

const proposalStatuses = [
  { value: "all", label: "All proposals" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Received" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
  { value: "withdrawn", label: "Withdrawn" },
];

const sortOptions: Array<{ value: CustomerInquirySort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "event_date", label: "Event date" },
  { value: "last_activity", label: "Last activity" },
];

const badgeToneClass: Record<CustomerInquiryTone, string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  red: "border-red-200 bg-red-50 text-red-700",
  gray: "border-slate-200 bg-slate-50 text-slate-700",
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatRelative(value: number) {
  if (!value) return "No activity yet";
  const diffMs = Date.now() - value;
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatCurrency(value?: number | string | null) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "Pending quote";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getSupplierImage(supplier: any) {
  return (
    supplier?.profile_image_url ||
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80"
  );
}

function getEventLocation(inquiry: any) {
  const booking = first(inquiry.bookings);
  const venue = first(booking?.venues);
  const venueLocation = [venue?.city, venue?.province].filter(Boolean).join(", ");
  return (
    inquiry.location_snapshot ||
    inquiry.venue_name_snapshot ||
    inquiry.event_location ||
    (venue?.name ? `${venue.name}${venueLocation ? ` - ${venueLocation}` : ""}` : null) ||
    "Location unavailable"
  );
}

function getEventDate(inquiry: any) {
  const booking = first(inquiry.bookings);
  return inquiry.event_date_snapshot || inquiry.event_date || booking?.event_date || null;
}

function getGuestCount(inquiry: any) {
  const booking = first(inquiry.bookings);
  return inquiry.guest_count_snapshot || inquiry.guest_count || booking?.guest_count || null;
}

function getPrimaryQuote(inquiry: any) {
  const quotes = Array.isArray(inquiry.supplier_quotes)
    ? inquiry.supplier_quotes
    : inquiry.supplier_quotes
      ? [inquiry.supplier_quotes]
      : [];
  const status = getPrimaryQuoteStatus(inquiry);
  return quotes.find((quote: any) => quote.status === status) ?? quotes[0] ?? null;
}

function buildInquiryHref(
  overrides: {
    q?: string;
    status?: string;
    proposal?: string;
    sort?: string;
  } = {},
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(overrides)) {
    if (!value || value === "all" || (key === "sort" && value === "newest")) {
      continue;
    }
    params.set(key, value);
  }

  const suffix = params.toString();
  return suffix
    ? `/bookings?view=suppliers&${suffix}`
    : "/bookings?view=suppliers";
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: CustomerInquiryTone;
}) {
  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-full border px-3.5 py-1 text-xs font-semibold tracking-[0.02em]",
        badgeToneClass[tone],
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export function CustomerInquiryList({
  inquiries,
  query = {},
}: CustomerInquiryListProps) {
  const q = query.q ?? "";
  const status = query.status ?? "all";
  const proposal = query.proposal ?? "all";
  const sort = (query.sort === "event_date" || query.sort === "last_activity"
    ? query.sort
    : "newest") as CustomerInquirySort;
  const filtered = filterCustomerInquiries(inquiries, {
    q,
    inquiryStatus: status,
    proposalStatus: proposal,
    sort,
  });
  const hasFilters = Boolean(q || status !== "all" || proposal !== "all" || sort !== "newest");
  const stats = getCustomerInquiryStats(inquiries);
  const statusCounts = inquiryStatuses.reduce(
    (counts, option) => {
      counts[option.value] =
        option.value === "all"
          ? inquiries.length
          : inquiries.filter((inquiry) => inquiry.status === option.value).length;
      return counts;
    },
    {} as Record<string, number>,
  );

  if (inquiries.length === 0) {
    return (
      <CustomerEmptyState
        icon={Mail}
        eyebrow="No supplier inquiries yet"
        title="No supplier inquiries yet"
        description="When you contact a supplier or request a service proposal, your inquiries will appear here."
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <CustomerLinkButton href="/suppliers">
              Browse Suppliers
            </CustomerLinkButton>
            <CustomerLinkButton href="/bookings" tone="secondary">
              View Venue Bookings
            </CustomerLinkButton>
          </div>
        }
      />
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(({ label, value }) => (
          <CustomerCard key={label} className="p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#6B7280]">
              {label}
            </p>
            <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#111827]">
              {value}
            </p>
          </CustomerCard>
        ))}
      </div>

      <CustomerCard className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" />
          <p className="text-sm font-extrabold text-slate-900">
            Filter by status
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {inquiryStatuses.map((option) => {
            const isActive = status === option.value;

            return (
              <Link
                key={option.value}
                href={buildInquiryHref({ q, status: option.value, proposal, sort })}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-extrabold transition",
                  isActive
                    ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] shadow-sm"
                    : "border-[#E5E7EB] bg-[#F9FAFB] text-slate-600 hover:border-[#BFDBFE] hover:bg-white hover:text-[#2563EB]",
                ].join(" ")}
              >
                {option.label}
                <span
                  className={[
                    "inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-black",
                    isActive
                      ? "bg-[#2563EB] text-white"
                      : "bg-white text-slate-500",
                  ].join(" ")}
                >
                  {statusCounts[option.value] ?? 0}
                </span>
              </Link>
            );
          })}
        </div>

        <form className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px_auto]">
          <input type="hidden" name="status" value={status} />
          <label className="relative block">
            <span className="sr-only">Search supplier inquiries</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search supplier or service"
              className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-11 pr-4 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
            />
          </label>

          <label>
            <span className="sr-only">Proposal status</span>
            <select
              name="proposal"
              defaultValue={proposal}
              className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
            >
              {proposalStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Sort inquiries</span>
            <select
              name="sort"
              defaultValue={sort}
              className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white transition hover:bg-[#1D4ED8] lg:flex-none"
            >
              Apply
            </button>
            {hasFilters ? (
              <Link
                href="/bookings?view=suppliers"
                aria-label="Clear filters"
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
              >
                <FilterX className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </form>

        <p className="mt-4 text-sm font-bold text-[#6B7280]">
          Showing {filtered.length} of {inquiries.length} supplier inquiries
        </p>
      </CustomerCard>

      {filtered.length === 0 ? (
        <CustomerEmptyState
          icon={Mail}
          eyebrow="No matches"
          title="No supplier inquiries match these filters."
          description="Try another status, proposal state, or search term."
          action={
            <CustomerLinkButton href="/bookings?view=suppliers" tone="secondary">
              Clear filters
            </CustomerLinkButton>
          }
        />
      ) : (
        filtered.map((inquiry) => {
          const supplier = first(inquiry.supplier_profiles);
          const service = first(inquiry.supplier_services);
          const quoteStatus = getPrimaryQuoteStatus(inquiry);
          const displayStatus = getInquiryDisplayStatus(inquiry.status, quoteStatus);
          const proposalLabel = quoteStatus
            ? getInquiryDisplayStatus(null, quoteStatus).label
            : "No proposal yet";
          const quote = getPrimaryQuote(inquiry);
          const supplierImage = getSupplierImage(supplier);
          const guestCount = getGuestCount(inquiry);

          return (
            <article
              key={inquiry.id}
              className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70 lg:h-[260px]"
            >
              <div className="grid gap-0 lg:h-full lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="relative h-56 overflow-hidden bg-[#EFF6FF] lg:h-full">
                  <img
                    src={supplierImage}
                    alt={supplier?.business_name ?? "Supplier"}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent lg:bg-gradient-to-r" />
                </div>

                <div className="flex flex-col justify-between p-5 sm:p-6 lg:col-start-2 lg:h-full">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <StatusBadge
                        label={displayStatus.label}
                        tone={displayStatus.tone}
                      />

                      <h2 className="mt-3 truncate text-2xl font-black tracking-[-0.04em] text-[#111827]">
                        {supplier?.business_name ?? "Supplier"}
                      </h2>
                      <p className="mt-1 truncate text-sm font-bold text-[#6B7280]">
                        {service?.name ?? supplier?.supplier_categories?.name ?? "General inquiry"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-[#6B7280] lg:flex-nowrap">
                        <span className="inline-flex min-w-0 max-w-full items-center gap-2 truncate lg:max-w-[52%]">
                          <MapPin className="h-4 w-4 text-[#2563EB]" />
                          <span className="truncate">
                            {getEventLocation(inquiry)}
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-[#2563EB]" />
                          {formatDate(getEventDate(inquiry))}
                        </span>
                        {guestCount ? (
                          <span className="inline-flex shrink-0 items-center gap-2">
                            <TicketCheck className="h-4 w-4 text-[#2563EB]" />
                            {Number(guestCount).toLocaleString("en-PH")} guests
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 lg:min-w-[132px] lg:text-right">
                      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
                        Proposal
                      </p>
                      <p className="mt-1 text-lg font-black text-[#111827]">
                        {quote?.total ? formatCurrency(quote.total) : proposalLabel}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <CustomerLinkButton href={`/inquiries/${inquiry.id}`} tone="secondary">
                        View Details
                      </CustomerLinkButton>

                      {supplier?.slug ? (
                        <Link
                          href={`/suppliers/${supplier.slug}`}
                          className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-5 text-sm font-extrabold text-[#111827] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                        >
                          <Store className="mr-2 h-4 w-4" />
                          View Supplier
                        </Link>
                      ) : null}
                    </div>

                    <p className="mt-4 text-xs font-semibold text-slate-400">
                      Last activity: {formatRelative(getLastInquiryActivityAt(inquiry))}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
