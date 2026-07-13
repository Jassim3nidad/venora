import { describe, expect, it } from "vitest";
import {
  supplierAvailabilitySchema,
  supplierMessageSchema,
  supplierQuoteSchema,
} from "./supplier-dashboard.schema";

const inquiryId = "00000000-0000-4000-8000-000000000010";

const validQuote = {
  inquiryId,
  title: "Wedding photography coverage",
  serviceDescription: "Eight hours of event photography.",
  items: [
    {
      description: "Lead photographer",
      quantity: 2,
      unitPrice: 12500,
    },
  ],
  additionalFees: 1500,
  validUntil: "2026-12-15",
  terms: "A reservation deposit is required.",
};

describe("supplier dashboard schemas", () => {
  it("accepts a complete quote draft", () => {
    expect(supplierQuoteSchema.parse(validQuote)).toMatchObject(validQuote);
  });

  it("requires at least one quote line item", () => {
    expect(() =>
      supplierQuoteSchema.parse({ ...validQuote, items: [] }),
    ).toThrow("Add at least one quote item");
  });

  it("rejects negative quote amounts", () => {
    expect(() =>
      supplierQuoteSchema.parse({
        ...validQuote,
        items: [{ description: "Service", quantity: 1, unitPrice: -1 }],
      }),
    ).toThrow();
  });

  it("accepts manual supplier availability states", () => {
    expect(
      supplierAvailabilitySchema.parse({
        date: "2026-12-01",
        status: "blocked",
        reason: "Private event",
      }),
    ).toEqual({
      date: "2026-12-01",
      status: "blocked",
      reason: "Private event",
    });
  });

  it("rejects booked as a manual availability state", () => {
    expect(() =>
      supplierAvailabilitySchema.parse({
        date: "2026-12-01",
        status: "booked",
      }),
    ).toThrow();
  });

  it("trims inquiry messages and rejects empty text", () => {
    expect(
      supplierMessageSchema.parse({
        inquiryId,
        message: "  We can accommodate your timeline.  ",
      }),
    ).toEqual({
      inquiryId,
      message: "We can accommodate your timeline.",
    });

    expect(() =>
      supplierMessageSchema.parse({ inquiryId, message: "   " }),
    ).toThrow();
  });
});
