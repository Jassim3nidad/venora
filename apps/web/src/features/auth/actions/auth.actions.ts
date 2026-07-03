"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../schemas/auth.schema";
import {
  registerUserUseCase,
  authenticateUserUseCase,
  resendVerificationEmailUseCase,
  signInWithOAuthUseCase,
  signOutUseCase,
  requestPasswordResetUseCase,
  resetPasswordUseCase,
  updateProfileUseCase,
  getCurrentUserUseCase,
} from "../application/auth.usecases";
import type { ActionResult } from "../types/auth.types";
import { type RoleName } from "@/lib/rbac/roles";
import { toErrorMessage } from "@/lib/errors";

function isUnverifiedEmailError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("confirm your email") ||
    normalized.includes("not verified")
  );
}

function isAlreadyRegisteredError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already")
  );
}

export async function registerAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await registerUserUseCase({
      email: parsed.data.email,
      password: parsed.data.password,
      fullName: parsed.data.fullName,
      role: parsed.data.role as RoleName,
    });

    try {
      await resendVerificationEmailUseCase(parsed.data.email);
    } catch (resendError) {
      console.error("[registerAction] Verification email resend failed:", resendError);
    }
  } catch (error) {
    const message = toErrorMessage(error);

    if (isAlreadyRegisteredError(message)) {
      try {
        await resendVerificationEmailUseCase(parsed.data.email);
      } catch (resendError) {
        console.error("[registerAction] Existing user verification resend failed:", resendError);
      }

      redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}&resend=available`);
    }

    return {
      success: false,
      error: message,
    };
  }

  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function loginAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await authenticateUserUseCase(parsed.data);
  } catch (error) {
    const message = toErrorMessage(error);

    return {
      success: false,
      error: message,
      data: isUnverifiedEmailError(message)
        ? { reason: "email_unverified", email: parsed.data.email }
        : undefined,
    };
  }

  redirect("/venues");
}

export async function resendVerificationEmailAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: "Enter a valid email address.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await resendVerificationEmailUseCase(parsed.data.email);
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }

  return {
    success: true,
    data: undefined,
  };
}

export async function signInWithOAuthAction(
  provider: "google",
): Promise<ActionResult> {
  try {
    await signInWithOAuthUseCase(provider);
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }

  return {
    success: true,
    data: undefined,
  };
}

export async function signOutAction(): Promise<ActionResult> {
  try {
    await signOutUseCase();
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }

  redirect("/");
}

export async function forgotPasswordAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await requestPasswordResetUseCase(parsed.data.email);
  } catch (error) {
    console.error(
      "[forgotPasswordAction] Password reset request error swallowed:",
      error,
    );
  }

  return {
    success: true,
    data: undefined,
  };
}

export async function resetPasswordAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await resetPasswordUseCase(parsed.data.password);
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }

  try {
    await signOutUseCase();
  } catch {
    // Best effort only.
  }

  redirect("/login?reset=true");
}

export async function updateProfileAction(
  rawInput: unknown,
): Promise<ActionResult<{ full_name?: string | null; phone?: string | null }>> {
  const parsed = updateProfileSchema.safeParse(rawInput);

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
        error: "You must be logged in to update your profile.",
      };
    }

    const { error: updateError } = await (
      supabase.from("profiles") as any
    )
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone?.trim() || null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[updateProfileAction] Database error:", updateError);
      return {
        success: false,
        error: updateError.message,
      };
    }

    // Fetch updated profile to return fresh data
    const { data: updatedProfile, error: fetchError } = await (
      supabase.from("profiles") as any
    )
      .select("full_name, phone")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      console.error("[updateProfileAction] Fetch error:", fetchError);
    }

    revalidatePath("/account", "layout");

    return {
      success: true,
      data: updatedProfile,
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }
}

export async function changePasswordAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await getCurrentUserUseCase();

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to change your password.",
      };
    }

    const { createClient: createJSClient } = require("@supabase/supabase-js");

    const tempClient = createJSClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
      },
    );

    const { error: verifyError } = await tempClient.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.oldPassword,
    });

    if (verifyError) {
      return {
        success: false,
        error: "Incorrect current password.",
      };
    }

    await resetPasswordUseCase(parsed.data.password);

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }
}
