"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { createServerAction } from "@/lib/server-action";
import type { TablesInsert } from "@venora/database";
import {
  deleteGuestSchema,
  guestInputSchema,
  importGuestsSchema,
  issueGuestRsvpSchema,
  revokeGuestRsvpSchema,
  type GuestInput,
} from "../schemas/guest.schema";

const GUEST_SELECT =
  "id,user_id,booking_id,first_name,last_name,email,phone,guest_group,plus_ones_allowed,plus_ones_attending,dietary_requirements,accessibility_notes,rsvp_status,rsvp_token,invitation_sent_at,rsvp_deadline,rsvp_responded_at,rsvp_revoked_at,rsvp_invitation_delivered_at,rsvp_reminder_sent_at,rsvp_delivery_error,created_at,updated_at";

async function requireGuestUser() {
  // The repository's hand-maintained Database shape predates Supabase's
  // Relationships metadata requirement, so the runtime query builder resolves
  // mutations to never. Payloads remain checked against the generated table
  // Insert type until live regeneration can update the full schema safely.
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError("Please sign in to manage guests.");
  }

  return { supabase, user };
}

function guestPayload(
  input: GuestInput,
  userId: string,
): TablesInsert<"event_guests"> {
  return {
    user_id: userId,
    booking_id: input.bookingId ?? null,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email ?? null,
    phone: input.phone ?? null,
    guest_group: input.guestGroup,
    plus_ones_allowed: input.plusOnesAllowed,
    dietary_requirements: input.dietaryRequirements ?? null,
    accessibility_notes: input.accessibilityNotes ?? null,
    rsvp_status: input.rsvpStatus,
  };
}

function throwGuestError(error: { message?: string } | null) {
  if (!error) return;
  throw new ValidationError(
    error.message?.includes("row-level security")
      ? "Guest or booking access was denied."
      : "Unable to save guest information.",
  );
}

function revalidateGuestPages() {
  revalidatePath("/account/guests");
  revalidatePath("/dashboard/planning/guests");
}

export async function saveGuestAction(rawInput: unknown) {
  return createServerAction(
    guestInputSchema,
    async (input) => {
      const { supabase, user } = await requireGuestUser();
      const payload = guestPayload(input, user.id);

      const query = input.id
        ? supabase
            .from("event_guests")
            .update(payload)
            .eq("id", input.id)
            .eq("user_id", user.id)
        : supabase.from("event_guests").insert(payload);

      const { data, error } = await query.select(GUEST_SELECT).single();
      throwGuestError(error);
      revalidateGuestPages();

      return { guest: data };
    },
    rawInput,
  );
}

export async function deleteGuestAction(rawInput: unknown) {
  return createServerAction(
    deleteGuestSchema,
    async (input) => {
      const { supabase, user } = await requireGuestUser();
      const { data, error } = await supabase
        .from("event_guests")
        .delete()
        .eq("id", input.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      throwGuestError(error);
      if (!data) throw new ValidationError("Guest not found or access denied.");
      revalidateGuestPages();

      return { guestId: input.id };
    },
    rawInput,
  );
}

export async function importGuestsAction(rawInput: unknown) {
  return createServerAction(
    importGuestsSchema,
    async (input) => {
      const { supabase, user } = await requireGuestUser();
      const payload = input.guests.map((guest) => guestPayload(guest, user.id));
      const { data, error } = await supabase
        .from("event_guests")
        .insert(payload)
        .select(GUEST_SELECT);

      throwGuestError(error);
      revalidateGuestPages();

      return { imported: data?.length ?? 0, guests: data ?? [] };
    },
    rawInput,
  );
}

export async function issueGuestRsvpAction(rawInput: unknown) {
  return createServerAction(
    issueGuestRsvpSchema,
    async (input) => {
      const { supabase, user } = await requireGuestUser();
      const token = crypto.randomUUID();
      const { data, error } = await supabase
        .from("event_guests")
        .update({
          rsvp_token: token,
          invitation_sent_at: new Date().toISOString(),
          rsvp_deadline: input.deadline ?? null,
          rsvp_revoked_at: null,
        })
        .eq("id", input.id)
        .eq("user_id", user.id)
        .select("id,rsvp_token,rsvp_deadline")
        .maybeSingle();

      throwGuestError(error);
      if (!data) throw new ValidationError("Guest not found or access denied.");

      const deliveryResult = await supabase.functions.invoke(
        "rsvp-notifications",
        {
          body: { mode: "invitation", guestId: data.id },
        },
      );
      const delivery =
        deliveryResult.error ||
        !["sent", "skipped"].includes(deliveryResult.data?.delivery)
          ? "failed"
          : (deliveryResult.data.delivery as "sent" | "skipped");

      revalidateGuestPages();
      return { ...data, delivery };
    },
    rawInput,
  );
}

export async function revokeGuestRsvpAction(rawInput: unknown) {
  return createServerAction(
    revokeGuestRsvpSchema,
    async (input) => {
      const { supabase, user } = await requireGuestUser();
      const { data, error } = await supabase
        .from("event_guests")
        .update({ rsvp_revoked_at: new Date().toISOString() })
        .eq("id", input.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      throwGuestError(error);
      if (!data) throw new ValidationError("Guest not found or access denied.");
      revalidateGuestPages();
      return { guestId: input.id };
    },
    rawInput,
  );
}
