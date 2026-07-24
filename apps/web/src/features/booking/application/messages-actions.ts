"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/src/lib/errors";
import { sendBookingMessageSchema } from "../schemas/booking.schema";
import { isAdminUser } from "@/src/lib/rbac/guards";
import { insertNotificationsForUsers } from "@/src/features/notifications/application/insert-notifications";

// ── Status gate ──────────────────────────────────────────────
const MESSAGING_ALLOWED_STATUSES = new Set([
  "pending",
  "approved",
  "payment_pending",
  "confirmed",
]);

// ── Types ────────────────────────────────────────────────────
export type BookingMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_role: "customer" | "venue_owner";
  message: string;
  created_at: string;
  sender_name?: string | null;
};

type BookingAccessResult = {
  booking: {
    id: string;
    status: string;
    customer_id: string;
    venue_id: string;
    organization_id: string | null;
    venue_org_owner_id: string | null;
  };
  role: "customer" | "venue_owner";
  isOrgOwner: boolean;
};

// ── Access helper ────────────────────────────────────────────
async function assertBookingAccess(
  supabase: any,
  bookingId: string,
  userId: string,
): Promise<BookingAccessResult> {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
        id,
        status,
        customer_id,
        venue_id,
        venues (
          organization_id,
          organizations:organization_id (
            owner_id
          )
        )
      `,
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error) throw new ValidationError("Failed to load booking.");
  if (!booking) throw new NotFoundError("Booking");

  // Customer path
  if (booking.customer_id === userId) {
    const orgOwner = getOrgOwnerId(booking);
    return {
      booking: {
        id: booking.id,
        status: booking.status,
        customer_id: booking.customer_id,
        venue_id: booking.venue_id,
        organization_id: getOrgId(booking),
        venue_org_owner_id: orgOwner,
      },
      role: "customer",
      isOrgOwner: false,
    };
  }

  // Admin path
  const isAdmin = await isAdminUser(supabase, userId);
  if (isAdmin) {
    return {
      booking: {
        id: booking.id,
        status: booking.status,
        customer_id: booking.customer_id,
        venue_id: booking.venue_id,
        organization_id: getOrgId(booking),
        venue_org_owner_id: getOrgOwnerId(booking),
      },
      role: "venue_owner",
      isOrgOwner: true,
    };
  }

  // Venue owner / member path
  const orgId = getOrgId(booking);
  if (!orgId) {
    throw new ForbiddenError("You do not have access to this booking.");
  }

  const [{ data: member }, { data: orgOwner }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("organization_id, permissions")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", orgId)
      .eq("owner_id", userId)
      .maybeSingle(),
  ]);

  if (orgOwner) {
    return {
      booking: {
        id: booking.id,
        status: booking.status,
        customer_id: booking.customer_id,
        venue_id: booking.venue_id,
        organization_id: orgId,
        venue_org_owner_id: getOrgOwnerId(booking),
      },
      role: "venue_owner",
      isOrgOwner: true,
    };
  }

  if (!member) {
    throw new ForbiddenError("You do not have access to this booking.");
  }

  const memberPermissions = Array.isArray(member.permissions)
    ? (member.permissions as string[])
    : [];

  if (!memberPermissions.includes("message_assigned_customers")) {
    throw new ForbiddenError(
      "You do not have permission to message customers for this booking.",
    );
  }

  const { data: assignment } = await supabase
    .from("venue_coordinator_assignments")
    .select("venue_id")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .eq("venue_id", booking.venue_id)
    .maybeSingle();

  if (!assignment) {
    throw new ForbiddenError(
      "You are not assigned to this venue and cannot message its customers.",
    );
  }

  return {
    booking: {
      id: booking.id,
      status: booking.status,
      customer_id: booking.customer_id,
      venue_id: booking.venue_id,
      organization_id: orgId,
      venue_org_owner_id: getOrgOwnerId(booking),
    },
    role: "venue_owner",
    isOrgOwner: false,
  };
}

function getOrgId(booking: any): string | null {
  const venues = booking.venues;
  if (!venues) return null;
  const venue = Array.isArray(venues) ? venues[0] : venues;
  return venue?.organization_id ?? null;
}

function getOrgOwnerId(booking: any): string | null {
  const venues = booking.venues;
  if (!venues) return null;
  const venue = Array.isArray(venues) ? venues[0] : venues;
  const orgs = venue?.organizations;
  if (!orgs) return null;
  const org = Array.isArray(orgs) ? orgs[0] : orgs;
  return org?.owner_id ?? null;
}

async function collectVenueTeamRecipientIds(
  supabase: any,
  params: {
    organizationId: string | null;
    venueId: string;
    venueOrgOwnerId: string | null;
    excludeUserId?: string | null;
  },
) {
  const recipientIds = new Set<string>();

  if (
    params.venueOrgOwnerId &&
    params.venueOrgOwnerId !== params.excludeUserId
  ) {
    recipientIds.add(params.venueOrgOwnerId);
  }

  if (!params.organizationId) return recipientIds;

  const { data: assignments } = await supabase
    .from("venue_coordinator_assignments")
    .select("user_id")
    .eq("organization_id", params.organizationId)
    .eq("venue_id", params.venueId);

  const assignedUserIds = ((assignments ?? []) as Array<{ user_id: string }>)
    .map((row) => row.user_id)
    .filter((id) => id !== params.excludeUserId);

  if (assignedUserIds.length === 0) return recipientIds;

  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", params.organizationId)
    .eq("status", "active")
    .in("user_id", assignedUserIds);

  for (const row of (members ?? []) as Array<{ user_id: string }>) {
    recipientIds.add(row.user_id);
  }

  return recipientIds;
}

async function notifyVenueTeamOfCustomerMessage(
  supabase: any,
  booking: BookingAccessResult["booking"],
  bookingId: string,
  messageBody: string,
) {
  const recipientIds = await collectVenueTeamRecipientIds(supabase, {
    organizationId: booking.organization_id,
    venueId: booking.venue_id,
    venueOrgOwnerId: booking.venue_org_owner_id,
  });

  await insertNotificationsForUsers(
    [...recipientIds].map((userId) => ({
      user_id: userId,
      title: "New booking message",
      body: messageBody,
      link:
        userId === booking.venue_org_owner_id
          ? `/dashboard/bookings/${bookingId}`
          : `/dashboard/coordinator/messages?thread=booking:${bookingId}`,
      kind: "booking_update",
    })),
  );
}

async function notifyBookingMessageRecipients(
  supabase: any,
  booking: BookingAccessResult["booking"],
  bookingId: string,
  messageBody: string,
  senderRole: "customer" | "venue_owner",
  senderId: string,
) {
  if (senderRole === "customer") {
    await notifyVenueTeamOfCustomerMessage(
      supabase,
      booking,
      bookingId,
      messageBody,
    );
    return;
  }

  const notifications: Array<{
    user_id: string;
    title: string;
    body: string;
    link: string;
    kind: string;
  }> = [];

  if (booking.customer_id && booking.customer_id !== senderId) {
    notifications.push({
      user_id: booking.customer_id,
      title: "New booking message",
      body: messageBody,
      link: `/bookings/${bookingId}`,
      kind: "booking_update",
    });
  }

  const teammateIds = await collectVenueTeamRecipientIds(supabase, {
    organizationId: booking.organization_id,
    venueId: booking.venue_id,
    venueOrgOwnerId: booking.venue_org_owner_id,
    excludeUserId: senderId,
  });

  for (const userId of teammateIds) {
    notifications.push({
      user_id: userId,
      title: "New booking message",
      body: messageBody,
      link:
        userId === booking.venue_org_owner_id
          ? `/dashboard/bookings/${bookingId}`
          : `/dashboard/coordinator/messages?thread=booking:${bookingId}`,
      kind: "booking_update",
    });
  }

  await insertNotificationsForUsers(notifications);
}

// ── getBookingMessages ───────────────────────────────────────
// Called from server components; verifies access via RLS.
export async function getBookingMessages(
  bookingId: string,
): Promise<BookingMessage[]> {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("booking_messages")
    .select("id, booking_id, sender_id, sender_role, message, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[booking_messages] fetch error:", error.message);
    return [];
  }

  const messages = data ?? [];
  if (messages.length === 0) return [];

  const senderIds = Array.from(new Set(messages.map((m: any) => m.sender_id)));
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", senderIds);

  const profilesMap = new Map(
    (profilesData ?? []).map((p: any) => [p.id, p.full_name]),
  );

  return messages.map((msg: any) => ({
    id: msg.id,
    booking_id: msg.booking_id,
    sender_id: msg.sender_id,
    sender_role: msg.sender_role,
    message: msg.message,
    created_at: msg.created_at,
    sender_name: profilesMap.get(msg.sender_id) ?? null,
  })) as BookingMessage[];
}

// ── sendBookingMessageAction ─────────────────────────────────
export async function sendBookingMessageAction(rawInput: unknown) {
  return createServerAction(
    sendBookingMessageSchema,
    async (input) => {
      const supabase = (await createClient()) as any;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError("You must be signed in to send messages.");
      }

      // 1. Verify access and determine role
      const { booking, role } = await assertBookingAccess(
        supabase,
        input.bookingId,
        user.id,
      );

      // 2. Check booking status allows messaging
      if (!MESSAGING_ALLOWED_STATUSES.has(booking.status)) {
        throw new ValidationError(
          "This conversation is read-only because the booking is no longer active.",
        );
      }

      // 3. Insert message
      const { error: insertError } = await supabase
        .from("booking_messages")
        .insert({
          booking_id: input.bookingId,
          sender_id: user.id,
          sender_role: role,
          message: input.message.trim(),
        });

      if (insertError) {
        console.error("[booking_messages] insert error:", insertError.message);
        throw new ValidationError("Failed to send message. Please try again.");
      }

      // 4. Notify customer, venue owner, and assigned coordinators
      try {
        await notifyBookingMessageRecipients(
          supabase,
          booking,
          input.bookingId,
          input.message,
          role,
          user.id,
        );
      } catch {
        // Notification failure must not block message send
      }

      // 5. Revalidate
      revalidatePath(`/bookings/${input.bookingId}`);
      revalidatePath(`/dashboard/bookings/${input.bookingId}`);
      revalidatePath(`/dashboard/coordinator/bookings/${input.bookingId}`);
      revalidatePath("/dashboard/coordinator/messages");

      return { ok: true };
    },
    rawInput,
  );
}
