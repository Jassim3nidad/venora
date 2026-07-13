export type CustomerInquiryTone =
  | "amber"
  | "blue"
  | "violet"
  | "green"
  | "red"
  | "gray";

export type CustomerInquirySort =
  | "newest"
  | "event_date"
  | "last_activity";

export type CustomerActivityView = "venue-bookings" | "supplier-inquiries";

export const SUPPLIER_INQUIRIES_ACTIVITY = "supplier-inquiries";

export type CustomerInquiryFilters = {
  q?: string;
  inquiryStatus?: string;
  proposalStatus?: string;
  sort?: CustomerInquirySort;
};

export type CustomerInquiryTimelineItem = {
  label: string;
  at: string;
  actor: "customer" | "supplier" | "system";
};

type SupplierProfileLike = {
  business_name?: string | null;
  supplier_categories?: { name?: string | null } | null;
};

type SupplierServiceLike = {
  name?: string | null;
};

type QuoteLike = {
  id?: string | null;
  status?: string | null;
  valid_until?: string | null;
  sent_at?: string | null;
  updated_at?: string | null;
};

type InquiryLike = {
  id?: string | null;
  customer_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  event_date?: string | null;
  event_date_snapshot?: string | null;
  supplier_profiles?: SupplierProfileLike | null;
  supplier_services?: SupplierServiceLike | null;
  supplier_quotes?: QuoteLike[] | QuoteLike | null;
};

type MessageLike = {
  id?: string | null;
  sender_id?: string | null;
  created_at?: string | null;
};

const quotePriority = [
  "accepted",
  "sent",
  "declined",
  "expired",
  "withdrawn",
  "draft",
];

export function parseCustomerActivityView(
  value?: string | null,
): CustomerActivityView {
  return value === SUPPLIER_INQUIRIES_ACTIVITY || value === "/account/inquiries"
    ? "supplier-inquiries"
    : "venue-bookings";
}

export function getCustomerActivityHref(view: CustomerActivityView) {
  return view === "supplier-inquiries"
    ? "/account/inquiries"
    : "/bookings";
}

function normalize(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function toTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function getPrimaryQuoteStatus(inquiry: InquiryLike) {
  const rawQuotes = inquiry.supplier_quotes;
  const quotes = Array.isArray(rawQuotes)
    ? rawQuotes
    : rawQuotes
      ? [rawQuotes]
      : [];

  const sorted = [...quotes].sort((left, right) => {
    const leftPriority = quotePriority.indexOf(normalize(left.status));
    const rightPriority = quotePriority.indexOf(normalize(right.status));
    return (
      (leftPriority === -1 ? 999 : leftPriority) -
        (rightPriority === -1 ? 999 : rightPriority) ||
      toTime(right.updated_at) - toTime(left.updated_at)
    );
  });

  return sorted[0]?.status ?? null;
}

export function getLastInquiryActivityAt(inquiry: InquiryLike) {
  const quoteStatus = getPrimaryQuoteStatus(inquiry);
  const quoteUpdatedAt = Array.isArray(inquiry.supplier_quotes)
    ? Math.max(...inquiry.supplier_quotes.map((quote) => toTime(quote.updated_at)), 0)
    : toTime(inquiry.supplier_quotes?.updated_at);

  const baseTime = Math.max(
    toTime(inquiry.updated_at),
    toTime(inquiry.created_at),
    quoteStatus ? quoteUpdatedAt : 0,
  );

  return baseTime;
}

export function getCustomerInquiryStats(inquiries: InquiryLike[]) {
  return [
    { label: "Total inquiries", value: inquiries.length },
    {
      label: "Pending review",
      value: inquiries.filter((inquiry) => normalize(inquiry.status) === "new").length,
    },
    {
      label: "Responded",
      value: inquiries.filter((inquiry) => normalize(inquiry.status) === "responded").length,
    },
    {
      label: "Proposals",
      value: inquiries.filter((inquiry) =>
        ["sent", "accepted", "declined"].includes(
          normalize(getPrimaryQuoteStatus(inquiry)),
        ),
      ).length,
    },
    {
      label: "Accepted",
      value: inquiries.filter(
        (inquiry) => normalize(getPrimaryQuoteStatus(inquiry)) === "accepted",
      ).length,
    },
  ];
}

export function getInquiryDisplayStatus(
  inquiryStatus?: string | null,
  quoteStatus?: string | null,
): { label: string; tone: CustomerInquiryTone; description: string } {
  const quote = normalize(quoteStatus);

  if (quote === "accepted") {
    return {
      label: "Accepted",
      tone: "green",
      description: "You accepted this supplier's Service Proposal.",
    };
  }

  if (quote === "declined") {
    return {
      label: "Declined",
      tone: "red",
      description: "You declined this supplier's Service Proposal.",
    };
  }

  if (quote === "sent") {
    return {
      label: "Proposal Received",
      tone: "violet",
      description: "The supplier sent a Service Proposal for review.",
    };
  }

  if (quote === "withdrawn") {
    return {
      label: "Withdrawn",
      tone: "gray",
      description: "The supplier withdrew this Service Proposal.",
    };
  }

  if (quote === "expired") {
    return {
      label: "Expired",
      tone: "gray",
      description: "The Service Proposal is no longer valid.",
    };
  }

  if (normalize(inquiryStatus) === "responded") {
    return {
      label: "Responded",
      tone: "blue",
      description: "The supplier has responded to this inquiry.",
    };
  }

  if (normalize(inquiryStatus) === "closed") {
    return {
      label: "Completed",
      tone: "green",
      description: "This supplier inquiry is closed.",
    };
  }

  return {
    label: "Pending",
    tone: "amber",
    description: "The supplier has not responded yet.",
  };
}

export function filterCustomerInquiries<T extends InquiryLike>(
  rows: T[],
  filters: CustomerInquiryFilters,
) {
  const query = normalize(filters.q);
  const inquiryStatus = normalize(filters.inquiryStatus ?? "all");
  const proposalStatus = normalize(filters.proposalStatus ?? "all");
  const sort = filters.sort ?? "newest";

  return rows
    .filter((row) => {
      const primaryQuoteStatus = normalize(getPrimaryQuoteStatus(row));
      const haystack = [
        row.supplier_profiles?.business_name,
        row.supplier_profiles?.supplier_categories?.name,
        row.supplier_services?.name,
      ]
        .map(normalize)
        .join(" ");

      return (
        (!query || haystack.includes(query)) &&
        (inquiryStatus === "all" || normalize(row.status) === inquiryStatus) &&
        (proposalStatus === "all" || primaryQuoteStatus === proposalStatus)
      );
    })
    .sort((left, right) => {
      if (sort === "event_date") {
        return (
          toTime(left.event_date_snapshot ?? left.event_date) -
          toTime(right.event_date_snapshot ?? right.event_date)
        );
      }

      if (sort === "last_activity") {
        return getLastInquiryActivityAt(right) - getLastInquiryActivityAt(left);
      }

      return toTime(right.created_at) - toTime(left.created_at);
    });
}

export function canCustomerActOnQuote(
  quote: Pick<QuoteLike, "status" | "valid_until"> | null | undefined,
  now = new Date(),
) {
  if (normalize(quote?.status) !== "sent") return false;
  if (!quote?.valid_until) return true;

  const validThrough = new Date(`${quote.valid_until}T23:59:59.999`);
  return Number.isFinite(validThrough.getTime()) && validThrough >= now;
}

export function buildInquiryTimeline(
  inquiry: InquiryLike,
  messages: MessageLike[],
  quote: QuoteLike | null | undefined,
) {
  const entries: CustomerInquiryTimelineItem[] = [];

  if (inquiry.created_at) {
    entries.push({
      label: "Inquiry submitted",
      at: inquiry.created_at,
      actor: "customer",
    });
  }

  for (const message of messages) {
    if (!message.created_at) continue;
    entries.push({
      label: "Message sent",
      at: message.created_at,
      actor: message.sender_id === inquiry.customer_id ? "customer" : "supplier",
    });
  }

  if (normalize(quote?.status) !== "draft" && quote?.sent_at) {
    entries.push({
      label: "Service Proposal sent",
      at: quote.sent_at,
      actor: "supplier",
    });
  }

  if (normalize(quote?.status) === "accepted" && quote?.updated_at) {
    entries.push({
      label: "Service Proposal accepted",
      at: quote.updated_at,
      actor: "customer",
    });
  }

  if (normalize(quote?.status) === "declined" && quote?.updated_at) {
    entries.push({
      label: "Service Proposal declined",
      at: quote.updated_at,
      actor: "customer",
    });
  }

  return entries.sort((left, right) => toTime(left.at) - toTime(right.at));
}
