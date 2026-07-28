"use server";

import { UnauthorizedError } from "@/lib/errors";
import { createServerAction } from "@/lib/server-action";
import { createClient } from "@/lib/supabase/server";
import { eventPlanInputSchema, generateAIEventPlan } from "./ai-planner";

export async function generateEventPlanAction(rawInput: unknown) {
  return createServerAction(
    eventPlanInputSchema,
    async (input) => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new UnauthorizedError(
          "Please sign in to generate an event plan.",
        );
      }

      return { plan: await generateAIEventPlan(input) };
    },
    rawInput,
  );
}
