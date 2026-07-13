import { describe, expect, it } from "vitest";
import {
  buildInquiryTimeline,
  canCustomerActOnQuote,
  filterCustomerInquiries,
  getCustomerInquiryStats,
  getCustomerActivityHref,
  parseCustomerActivityView,
  getInquiryDisplayStatus,
} from "./customer-inquiry.logic";

const baseInquiry = {
  id: "inquiry-1",
  status: "new",
  created_at: "2026-07-10T02:00:00.000Z",
  updated_at: "2026-07-10T02:00:00.000Z",
  supplier_profiles: {
    business_name: "Sugar Bloom Cakes",
    supplier_categories: { name: "Catering" },
  },
  supplier_services: { name: "Wedding Dessert Package" },
  supplier_quotes: [{ id: "quote-1", status: "sent", updated_at: "2026-07-10T04:00:00.000Z" }],
};

describe("customer supplier inquiry logic", () => {
  it("links supplier inquiries to the canonical account inquiry route", () => {
    expect(getCustomerActivityHref("venue-bookings")).toBe("/bookings");
    expect(getCustomerActivityHref("supplier-inquiries")).toBe(
      "/account/inquiries",
    );
    expect(parseCustomerActivityView("supplier-inquiries")).toBe(
      "supplier-inquiries",
    );
    expect(parseCustomerActivityView("/account/inquiries")).toBe(
      "supplier-inquiries",
    );
  });

  it("uses proposal status to show customer-friendly inquiry progress", () => {
    expect(getInquiryDisplayStatus("new", null)).toMatchObject({
      label: "Pending",
      tone: "amber",
    });
    expect(getInquiryDisplayStatus("responded", "sent")).toMatchObject({
      label: "Proposal Received",
      tone: "violet",
    });
    expect(getInquiryDisplayStatus("closed", "accepted")).toMatchObject({
      label: "Accepted",
      tone: "green",
    });
  });

  it("filters by supplier/service/status/proposal and sorts by last activity", () => {
    const rows = [
      { ...baseInquiry, supplier_quotes: [] },
      {
        ...baseInquiry,
        id: "inquiry-2",
        updated_at: "2026-07-11T02:00:00.000Z",
        supplier_profiles: {
          business_name: "Lush Sound",
          supplier_categories: { name: "Entertainment" },
        },
        supplier_services: { name: "DJ Package" },
        supplier_quotes: [{ id: "quote-2", status: "draft", updated_at: "2026-07-12T02:00:00.000Z" }],
      },
    ];

    const result = filterCustomerInquiries(rows, {
      q: "sound",
      inquiryStatus: "all",
      proposalStatus: "draft",
      sort: "last_activity",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("inquiry-2");
  });

  it("summarizes supplier inquiry stats for the activity cards", () => {
    const rows = [
      { ...baseInquiry, supplier_quotes: [] },
      {
        ...baseInquiry,
        id: "inquiry-2",
        status: "responded",
        supplier_quotes: [{ id: "quote-2", status: "sent" }],
      },
      {
        ...baseInquiry,
        id: "inquiry-3",
        status: "closed",
        supplier_quotes: [{ id: "quote-3", status: "accepted" }],
      },
    ];

    expect(getCustomerInquiryStats(rows)).toEqual([
      { label: "Total inquiries", value: 3 },
      { label: "Pending review", value: 1 },
      { label: "Responded", value: 1 },
      { label: "Proposals", value: 2 },
      { label: "Accepted", value: 1 },
    ]);
  });

  it("blocks customer proposal actions for expired and non-sent quotes", () => {
    const now = new Date("2026-07-13T00:00:00.000Z");

    expect(canCustomerActOnQuote({ status: "sent", valid_until: "2026-07-14" }, now)).toBe(true);
    expect(canCustomerActOnQuote({ status: "draft", valid_until: "2026-07-14" }, now)).toBe(false);
    expect(canCustomerActOnQuote({ status: "sent", valid_until: "2026-07-12" }, now)).toBe(false);
    expect(canCustomerActOnQuote({ status: "withdrawn", valid_until: null }, now)).toBe(false);
  });

  it("builds timeline entries from real inquiry, message, and quote timestamps only", () => {
    const timeline = buildInquiryTimeline(
      baseInquiry,
      [
        {
          id: "message-1",
          sender_id: "customer-1",
          created_at: "2026-07-10T03:00:00.000Z",
        },
      ],
      {
        id: "quote-1",
        status: "sent",
        sent_at: "2026-07-10T04:00:00.000Z",
        updated_at: "2026-07-10T04:00:00.000Z",
      },
    );

    expect(timeline.map((item) => item.label)).toEqual([
      "Inquiry submitted",
      "Message sent",
      "Service Proposal sent",
    ]);
  });
});
