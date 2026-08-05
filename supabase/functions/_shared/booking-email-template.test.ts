import { renderNotificationEmail } from "./booking-email-template.ts";

function assertIncludes(value: string, expected: string) {
  if (!value.includes(expected)) {
    throw new Error(`Expected rendered email to include: ${expected}`);
  }
}

Deno.test("renders branded booking approval email with escaped details", () => {
  const result = renderNotificationEmail(
    {
      title: "Venue approved your request",
      body: "Your quote is ready.",
      actionUrl: "https://venora.ph/bookings/booking-id/payment",
      metadata: { status: "approved" },
    },
    {
      bookingReference: "ABC12345",
      venueName: "Garden & <Glass>",
      eventDate: "2026-08-20",
      eventTime: "18:30:00",
      guestCount: 120,
      totalAmount: 150000,
      depositAmount: 75000,
      autoApproved: true,
    },
  );

  assertIncludes(result.html, "Venora");
  assertIncludes(result.html, "Approved instantly");
  assertIncludes(result.html, "Your venue said yes.");
  assertIncludes(result.html, "Garden &amp; &lt;Glass&gt;");
  assertIncludes(result.html, "August 20, 2026");
  assertIncludes(result.html, "6:30 PM");
  assertIncludes(result.html, "₱150,000.00");
  assertIncludes(result.html, "View booking and payment");
  assertIncludes(result.text, "Booking reference: ABC12345");
});

Deno.test("keeps non-approval notifications on the branded generic layout", () => {
  const result = renderNotificationEmail({
    title: "Payment started",
    body: "Your payment is pending confirmation.",
    actionUrl: "https://venora.ph/bookings/booking-id/payment",
    metadata: { status: "payment_pending" },
  });

  assertIncludes(result.html, "Payment started");
  assertIncludes(result.html, "Open in Venora");
  assertIncludes(result.text, "Your payment is pending confirmation.");
});
