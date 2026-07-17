export const BOOKING_CANCELLATION_REASONS = [
  { value: "plans_changed", label: "My plans changed" },
  { value: "found_another_venue", label: "I found another venue" },
  { value: "event_date_changed", label: "The event date changed" },
  { value: "budget_changed", label: "My budget changed" },
  { value: "event_cancelled", label: "The event is no longer happening" },
  { value: "other", label: "Other reason" },
] as const;

export type BookingCancellationReasonCode =
  (typeof BOOKING_CANCELLATION_REASONS)[number]["value"];

export function formatCancellationReason(
  reasonCode: BookingCancellationReasonCode,
  reasonDetail?: string,
) {
  const option = BOOKING_CANCELLATION_REASONS.find(
    (item) => item.value === reasonCode,
  );

  if (!option) {
    return reasonDetail?.trim() || "Cancelled by customer";
  }

  if (reasonCode === "other") {
    return reasonDetail?.trim() || option.label;
  }

  return option.label;
}
