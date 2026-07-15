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
    venue_org_owner_id: string | null;
  };
  role: "customer" | "venue_owner";
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
        venue_org_owner_id: orgOwner,
      },
      role: "customer",
    };
  }

  // Venue owner / member path
  const orgId = getOrgId(booking);
  if (orgId) {
    const [{ data: member }, { data: orgOwner }] = await Promise.all([
      supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("organization_id", orgId)
        .maybeSingle(),
      supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", orgId)
        .eq("owner_id", userId)
        .maybeSingle(),
    ]);

    if (member || orgOwner) {
      return {
        booking: {
          id: booking.id,
          status: booking.status,
          customer_id: booking.customer_id,
          venue_id: booking.venue_id,
          venue_org_owner_id: getOrgOwnerId(booking),
        },
        role: "venue_owner",
      };
    }
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
        venue_org_owner_id: getOrgOwnerId(booking),
      },
      role: "venue_owner",
    };
  }

  throw new ForbiddenError("You do not have access to this booking.");
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

      // 4. Try to notify the other party (fire-and-forget, never blocks)
      try {
        const recipientId =
          role === "customer"
            ? booking.venue_org_owner_id
            : booking.customer_id;

        if (recipientId && recipientId !== user.id) {
          const link =
            role === "customer"
              ? `/dashboard/bookings/${input.bookingId}`
              : `/bookings/${input.bookingId}`;

          await supabase.from("notifications").insert({
            user_id: recipientId,
            title: "New booking message",
            body: input.message.slice(0, 120),
            link,
            kind: "booking_update",
          });
        }
      } catch {
        // Notification failure must not block message send
      }

      // 5. Revalidate
      revalidatePath(`/bookings/${input.bookingId}`);
      revalidatePath(`/dashboard/bookings/${input.bookingId}`);

      return { ok: true };
    },
    rawInput,
  );
}
