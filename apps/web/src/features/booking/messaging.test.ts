import { describe, it, expect } from "vitest";

export interface BookingMessage {
  id: string;
  sender_id: string;
  is_internal_note: boolean;
  content: string;
}

export function filterCustomerMessages(
  messages: BookingMessage[],
): BookingMessage[] {
  return messages.filter((msg) => !msg.is_internal_note);
}

describe("Booking Communication & Internal Note Isolation", () => {
  it("should exclude internal organization notes from customer-facing queries", () => {
    const rawMessages: BookingMessage[] = [
      {
        id: "m1",
        sender_id: "u1",
        is_internal_note: false,
        content: "Hello venue!",
      },
      {
        id: "m2",
        sender_id: "staff1",
        is_internal_note: true,
        content: "Internal Note: Customer requested 50% discount.",
      },
      {
        id: "m3",
        sender_id: "staff1",
        is_internal_note: false,
        content: "We can accommodate your request.",
      },
    ];

    const customerVisible = filterCustomerMessages(rawMessages);
    expect(customerVisible).toHaveLength(2);
    expect(customerVisible.some((m) => m.is_internal_note)).toBe(false);
  });
});
