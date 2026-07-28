"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { createServerAction } from "@/lib/server-action";
import type { TablesInsert } from "@venora/database";
import {
  deleteTimelineTaskSchema,
  timelineTaskSchema,
  type TimelineTaskInput,
} from "../schemas/timeline.schema";

async function requireUser() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError("Please sign in to plan your event.");
  return { supabase, user };
}

function fail(error: { message?: string } | null, fallback: string) {
  if (!error) return;
  throw new ValidationError(
    error.message?.includes("row-level security")
      ? "Timeline access was denied."
      : fallback,
  );
}

function taskPayload(
  input: TimelineTaskInput,
  userId: string,
): TablesInsert<"event_timeline_tasks"> {
  return {
    user_id: userId,
    booking_id: input.bookingId ?? null,
    title: input.title,
    description: input.description,
    start_time: input.startTime,
    end_time: input.endTime,
    owner_name: input.ownerName,
    status: input.status,
    priority: input.priority,
    depends_on_task_id: input.dependsOnTaskId ?? null,
  };
}

export async function saveTimelineTaskAction(rawInput: unknown) {
  return createServerAction(
    timelineTaskSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      if (input.dependsOnTaskId) {
        const { data: dependency } = await supabase
          .from("event_timeline_tasks")
          .select("id,booking_id")
          .eq("id", input.dependsOnTaskId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!dependency) {
          throw new ValidationError("Dependency task not found.");
        }
        if (
          input.bookingId &&
          dependency.booking_id &&
          dependency.booking_id !== input.bookingId
        ) {
          throw new ValidationError("Dependency belongs to another booking.");
        }
      }

      const payload = taskPayload(input, user.id);
      const query = input.id
        ? supabase
            .from("event_timeline_tasks")
            .update(payload)
            .eq("id", input.id)
            .eq("user_id", user.id)
        : supabase.from("event_timeline_tasks").insert(payload);
      const { data, error } = await query
        .select(
          "id,user_id,booking_id,title,description,start_time,end_time,owner_name,supplier_id,status,priority,depends_on_task_id,created_at,updated_at",
        )
        .maybeSingle();
      fail(error, "Unable to save timeline task.");
      if (!data) throw new ValidationError("Timeline task not found.");
      revalidatePath("/account/timeline");
      return { task: data };
    },
    rawInput,
  );
}

export async function deleteTimelineTaskAction(rawInput: unknown) {
  return createServerAction(
    deleteTimelineTaskSchema,
    async (input) => {
      const { supabase, user } = await requireUser();
      const { data, error } = await supabase
        .from("event_timeline_tasks")
        .delete()
        .eq("id", input.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      fail(error, "Unable to delete timeline task.");
      if (!data) throw new ValidationError("Timeline task not found.");
      revalidatePath("/account/timeline");
      return { taskId: input.id };
    },
    rawInput,
  );
}
