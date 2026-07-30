"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  EventPlanActionResult,
  PersistedEventPlan,
} from "../domain/event-plan.types";
import { eventPlanPersistenceSchema } from "../schemas/event-plan.schema";
import {
  createEventPlanRepository,
  type EventPlanClient,
  EventPlanRepositoryError,
} from "../infrastructure/event-plan.repository";

const planIdSchema = z.string().uuid("Invalid event plan ID");
const titleSchema = z
  .preprocess((value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(120, "Keep the title under 120 characters").optional());

const sourceDraftFingerprintSchema = z
  .string()
  .trim()
  .min(8, "Draft fingerprint is required")
  .max(160, "Draft fingerprint is too long");

const createEventPlanActionSchema = z.object({
  draft: eventPlanPersistenceSchema,
  title: titleSchema,
  sourceDraftFingerprint: sourceDraftFingerprintSchema.optional(),
});

const saveAnonymousDraftActionSchema = z.object({
  draft: eventPlanPersistenceSchema,
  sourceDraftFingerprint: sourceDraftFingerprintSchema,
  title: titleSchema,
});

const updateEventPlanActionSchema = z.object({
  planId: planIdSchema,
  draft: eventPlanPersistenceSchema,
  title: titleSchema,
});

const planIdActionSchema = z.object({
  planId: planIdSchema,
});

type EventPlanMutationInput = z.infer<typeof createEventPlanActionSchema>;

function fieldErrorsFromZod(error: z.ZodError) {
  const flattened = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flattened).filter(([, messages]) => messages?.length),
  ) as Record<string, string[]>;
}

function validationResult(
  error: z.ZodError,
): EventPlanActionResult<never> {
  return {
    success: false,
    error: "Complete the required event plan fields.",
    fieldErrors: fieldErrorsFromZod(error),
  };
}

function databaseErrorResult(): EventPlanActionResult<never> {
  return {
    success: false,
    error: "Unable to save event plan. Please try again.",
  };
}

function createOptions(input: {
  title?: string | undefined;
  sourceDraftFingerprint?: string | undefined;
}) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.sourceDraftFingerprint !== undefined
      ? { sourceDraftFingerprint: input.sourceDraftFingerprint }
      : {}),
  };
}

async function getAuthenticatedContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false as const,
      result: {
        success: false,
        error: "Sign in to save your event plan.",
      } satisfies EventPlanActionResult<never>,
    };
  }

  return {
    success: true as const,
    userId: user.id,
    repository: createEventPlanRepository(supabase as unknown as EventPlanClient),
  };
}

function revalidatePlanner() {
  revalidatePath("/account/event-planner");
}

async function createForAuthenticatedCustomer(
  input: EventPlanMutationInput,
): Promise<EventPlanActionResult<PersistedEventPlan>> {
  const context = await getAuthenticatedContext();
  if (!context.success) return context.result;

  try {
    const plan = await context.repository.createForCustomer(
      context.userId,
      input.draft,
      createOptions(input),
    );

    revalidatePlanner();

    return { success: true, data: plan };
  } catch (error) {
    if (error instanceof EventPlanRepositoryError) return databaseErrorResult();
    throw error;
  }
}

export async function createEventPlanAction(
  rawInput: unknown,
): Promise<EventPlanActionResult<PersistedEventPlan>> {
  const parsed = createEventPlanActionSchema.safeParse(rawInput);
  if (!parsed.success) return validationResult(parsed.error);

  return createForAuthenticatedCustomer(parsed.data);
}

export async function saveAnonymousEventPlanDraftAction(
  rawInput: unknown,
): Promise<EventPlanActionResult<PersistedEventPlan>> {
  const parsed = saveAnonymousDraftActionSchema.safeParse(rawInput);
  if (!parsed.success) return validationResult(parsed.error);

  const context = await getAuthenticatedContext();
  if (!context.success) return context.result;

  try {
    const existing =
      await context.repository.findBySourceDraftFingerprintForCustomer(
        context.userId,
        parsed.data.sourceDraftFingerprint,
      );

    if (existing) return { success: true, data: existing };

    const plan = await context.repository.createForCustomer(
      context.userId,
      parsed.data.draft,
      createOptions(parsed.data),
    );

    revalidatePlanner();

    return { success: true, data: plan };
  } catch (error) {
    if (error instanceof EventPlanRepositoryError) return databaseErrorResult();
    throw error;
  }
}

export async function saveAnonymousDraftAfterAuthAction(
  rawInput: unknown,
): Promise<EventPlanActionResult<PersistedEventPlan>> {
  return saveAnonymousEventPlanDraftAction(rawInput);
}

export async function getEventPlanAction(
  rawInput: unknown,
): Promise<EventPlanActionResult<PersistedEventPlan>> {
  const parsed = planIdActionSchema.safeParse(rawInput);
  if (!parsed.success) return validationResult(parsed.error);

  const context = await getAuthenticatedContext();
  if (!context.success) return context.result;

  try {
    const plan = await context.repository.findByIdForCustomer(
      context.userId,
      parsed.data.planId,
    );

    if (!plan) {
      return {
        success: false,
        error: "Event plan not found or access denied.",
      };
    }

    return { success: true, data: plan };
  } catch (error) {
    if (error instanceof EventPlanRepositoryError) return databaseErrorResult();
    throw error;
  }
}

export async function listEventPlansAction(): Promise<
  EventPlanActionResult<PersistedEventPlan[]>
> {
  const context = await getAuthenticatedContext();
  if (!context.success) return context.result;

  try {
    const plans = await context.repository.listForCustomer(context.userId);
    return { success: true, data: plans };
  } catch (error) {
    if (error instanceof EventPlanRepositoryError) return databaseErrorResult();
    throw error;
  }
}

export async function listCustomerEventPlansAction(): Promise<
  EventPlanActionResult<PersistedEventPlan[]>
> {
  return listEventPlansAction();
}

export async function updateEventPlanAction(
  rawInput: unknown,
): Promise<EventPlanActionResult<PersistedEventPlan>> {
  const parsed = updateEventPlanActionSchema.safeParse(rawInput);
  if (!parsed.success) return validationResult(parsed.error);

  const context = await getAuthenticatedContext();
  if (!context.success) return context.result;

  try {
    const plan = await context.repository.updateForCustomer(
      context.userId,
      parsed.data.planId,
      parsed.data.draft,
      createOptions({ title: parsed.data.title }),
    );

    if (!plan) {
      return {
        success: false,
        error: "Event plan not found or access denied.",
      };
    }

    revalidatePlanner();

    return { success: true, data: plan };
  } catch (error) {
    if (error instanceof EventPlanRepositoryError) return databaseErrorResult();
    throw error;
  }
}

export async function archiveEventPlanAction(
  rawInput: unknown,
): Promise<EventPlanActionResult<PersistedEventPlan>> {
  const parsed = planIdActionSchema.safeParse(rawInput);
  if (!parsed.success) return validationResult(parsed.error);

  const context = await getAuthenticatedContext();
  if (!context.success) return context.result;

  try {
    const plan = await context.repository.archiveForCustomer(
      context.userId,
      parsed.data.planId,
    );

    if (!plan) {
      return {
        success: false,
        error: "Event plan not found or access denied.",
      };
    }

    revalidatePlanner();

    return { success: true, data: plan };
  } catch (error) {
    if (error instanceof EventPlanRepositoryError) return databaseErrorResult();
    throw error;
  }
}
