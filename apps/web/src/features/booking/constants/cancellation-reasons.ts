export const BOOKING_CANCELLATION_REASONS = [
  { value: "changed_my_mind", label: "Changed my mind" },
  { value: "found_another_venue", label: "Found another venue" },
  { value: "event_date_changed", label: "Event date changed" },
  { value: "budget_constraints", label: "Budget constraints" },
  { value: "no_longer_needed", label: "Event no longer needed" },
  { value: "other", label: "Other" },
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
