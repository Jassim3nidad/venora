"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toErrorMessage } from "@/lib/errors";
import type { ActionResult } from "../types/auth.types";
import { profileSetupSchema } from "../schemas/profile-setup.schema";

async function markProfileSetupComplete() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false as const,
      error: "You must be logged in to update your profile.",
    };
  }

  const { error: updateError } = await (supabase.from("profiles") as any)
    .update({ profile_setup_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    return {
      success: false as const,
      error: updateError.message,
    };
  }

  revalidatePath("/profile/setup");
  revalidatePath("/account", "layout");

  return { success: true as const };
}

export async function completeProfileSetupAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = profileSetupSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to complete profile setup.",
      };
    }

    const { error: updateError } = await (supabase.from("profiles") as any)
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone?.trim() || null,
        preferences: parsed.data.preferences,
        profile_setup_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      };
    }

    revalidatePath("/profile/setup");
    revalidatePath("/account", "layout");
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }

  redirect("/venues?setup=complete");
}

export async function skipProfileSetupAction(): Promise<ActionResult> {
  try {
    const result = await markProfileSetupComplete();

    if (!result.success) {
      return result;
    }
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }

  redirect("/venues");
}
