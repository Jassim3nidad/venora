import type { Metadata } from "next";
import { InfoPageShell } from "@/components/layout/InfoPageShell";

export const metadata: Metadata = { title: "Cancellation Options" };

const cards = [
  {
    title: "Customer cancellations",
    description:
      "Customers can review booking details and cancellation guidance before requesting changes.",
  },
  {
    title: "Venue owner policies",
    description:
      "Venue policies may vary by package, event date, payment stage, and owner approval process.",
  },
  {
    title: "Refund and approval notes",
    description:
      "Refund timing and eligibility depend on the booking terms, payment method, and venue confirmation status.",
  },
  {
    title: "Contact support",
    description:
      "If a cancellation needs review, Venora support can help clarify next steps with the booking record.",
  },
];

export default function CancellationOptionsPage() {
  return (
    <InfoPageShell
      eyebrow="Booking guidance"
      title="Cancellation Options"
      description="Understand the general cancellation flow for customers and venues before making changes to an event booking."
      cards={cards}
      ctaLabel="View Bookings"
      ctaHref="/bookings"
      secondaryCtaLabel="Visit Help Center"
      secondaryCtaHref="/help"
      note="This page provides general guidance only. Final cancellation, refund, and approval details may depend on the specific venue policy and booking status."
    />
  );
}
