"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { createServerAction } from "@/lib/server-action";
import type { TablesInsert } from "@venora/database";
import {
  deleteSeatingTableSchema,
  removeSeatingAssignmentSchema,
  seatingAssignmentSchema,
  seatingTableSchema,
  type SeatingTableInput,
} from "../schemas/seating.schema";

async function requireUser() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError("Please sign in to plan seating.");
  return { supabase, user };
}

function fail(error: { message?: string } | null, fallback: string) {
  if (!error) return;
  throw new ValidationError(
    error.message?.includes("row-level security")
      ? "Seating access was denied."
      : fallback,
  );
}

function refreshSeating() {
  revalidatePath("/account/seating");
}

function tablePayload(
  input: SeatingTableInput,
  userId: string,
): TablesInsert<"event_seating_tables"> {
  return {
    user_id: userId,
    booking_id: input.bookingId ?? null,
    table_name: input.tableName,
    capacity: input.capacity,
    notes: input.notes,
  };
}

export async function saveSeatingTableAction(rawInput: unknown) {
  return createServerAction(
    seatingTableSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      const payload = tablePayload(input, user.id);
      const query = input.id
        ? supabase
            .from("event_seating_tables")
            .update(payload)
            .eq("id", input.id)
            .eq("user_id", user.id)
        : supabase.from("event_seating_tables").insert(payload);
      const { data, error } = await query
        .select("id,user_id,booking_id,table_name,capacity,notes,created_at")
        .maybeSingle();
      fail(error, "Unable to save seating table.");
      if (!data) throw new ValidationError("Seating table not found.");
      refreshSeating();
      return { table: data };
    },
    rawInput,
  );
}

export async function deleteSeatingTableAction(rawInput: unknown) {
  return createServerAction(
    deleteSeatingTableSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      const { data, error } = await supabase
        .from("event_seating_tables")
        .delete()
        .eq("id", input.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      fail(error, "Unable to delete seating table.");
      if (!data) throw new ValidationError("Seating table not found.");
      refreshSeating();
      return { tableId: input.id };
    },
    rawInput,
  );
}

export async function assignGuestSeatAction(rawInput: unknown) {
  return createServerAction(
    seatingAssignmentSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      const [{ data: table }, { data: guest }] = await Promise.all([
        supabase
          .from("event_seating_tables")
          .select("id,booking_id,capacity")
          .eq("id", input.tableId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("event_guests")
          .select("id,booking_id")
          .eq("id", input.guestId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (!table || !guest) {
        throw new ValidationError("Table or guest not found.");
      }
      if (table.booking_id && guest.booking_id !== table.booking_id) {
        throw new ValidationError("Guest belongs to a different booking.");
      }

      const { count } = await supabase
        .from("event_seating_assignments")
        .select("id", { count: "exact", head: true })
        .eq("table_id", input.tableId);
      if ((count ?? 0) >= table.capacity) {
        throw new ValidationError("This table is already at capacity.");
      }

      const { data, error } = await supabase
        .from("event_seating_assignments")
        .insert({
          table_id: input.tableId,
          guest_id: input.guestId,
          seat_number: input.seatNumber ?? null,
        })
        .select("id,table_id,guest_id,seat_number,created_at")
        .maybeSingle();
      fail(error, "Unable to assign guest.");
      if (!data) throw new ValidationError("Unable to assign guest.");
      refreshSeating();
      return { assignment: data };
    },
    rawInput,
  );
}

export async function removeGuestSeatAction(rawInput: unknown) {
  return createServerAction(
    removeSeatingAssignmentSchema,
    async (input) => {
      const { supabase } = await requireUser();
      const { data, error } = await supabase
        .from("event_seating_assignments")
        .delete()
        .eq("id", input.id)
        .select("id")
        .maybeSingle();
      fail(error, "Unable to remove guest assignment.");
      if (!data) throw new ValidationError("Guest assignment not found.");
      refreshSeating();
      return { assignmentId: input.id };
    },
    rawInput,
  );
}
