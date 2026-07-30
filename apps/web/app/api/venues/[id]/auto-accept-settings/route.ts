import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { venueAutoAcceptSettingsSchema } from "@/src/features/booking/schemas/auto-accept.schema";

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    { data: null, error: { code, message, details } },
    { status },
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: venueId } = await context.params;
  const parsed = venueAutoAcceptSettingsSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Check the auto-accept settings and try again.",
      400,
      parsed.error.flatten(),
    );
  }

  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("UNAUTHORIZED", "Please sign in to continue.", 401);
  }

  const input = parsed.data;
  const { data, error } = await supabase.rpc(
    "upsert_venue_auto_accept_settings",
    {
      p_venue_id: venueId,
      p_enabled: input.enabled,
      p_minimum_notice_hours: input.minimumNoticeHours,
      p_maximum_guest_count: input.maximumGuestCount ?? null,
      p_allowed_weekdays: input.allowedWeekdays,
      p_allowed_start_time: input.allowedStartTime ?? null,
      p_allowed_end_time: input.allowedEndTime ?? null,
      p_minimum_duration_minutes: input.minimumDurationMinutes ?? null,
      p_maximum_duration_minutes: input.maximumDurationMinutes ?? null,
      p_minimum_booking_amount: input.minimumBookingAmount ?? null,
      p_require_standard_package: input.requireStandardPackage,
      p_require_deposit: input.requireDeposit,
      p_require_verified_customer: input.requireVerifiedCustomer,
      p_allowed_event_type_ids: input.allowedEventTypeIds,
      p_confidence_threshold: input.confidenceThreshold,
      p_review_window_minutes: input.reviewWindowMinutes,
    },
  );

  if (error) {
    const forbidden = error.message.toLowerCase().includes("permission");
    return errorResponse(
      forbidden ? "FORBIDDEN" : "SETTINGS_UPDATE_FAILED",
      forbidden
        ? "You do not have permission to configure this venue."
        : error.message,
      forbidden ? 403 : 400,
    );
  }

  revalidatePath("/dashboard/venue-owner/settings");
  return NextResponse.json({ data, error: null });
}
