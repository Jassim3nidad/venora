"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  updateAvatarSchema,
  changePasswordSchema,
  deleteAccountSchema,
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
  verifyOtpUseCase,
} from "../application/auth.usecases";
import type { ActionResult } from "../types/auth.types";
import { type RoleName } from "@/lib/rbac/roles";
import { resolvePostAuthRedirect } from "@/lib/profile-setup";
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

function getAvatarsStoragePath(publicUrl: string | null | undefined) {
  if (!publicUrl) return null;

  const marker = "/storage/v1/object/public/avatars/";
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;

  return publicUrl.slice(index + marker.length);
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
      role: "customer",
    });

    try {
      await resendVerificationEmailUseCase(parsed.data.email);
    } catch (resendError) {
      console.error("[registerAction] Verification email resend failed:", resendError);
    }
  } catch (error) {
    const message = toErrorMessage(error);

    if (isAlreadyRegisteredError(message)) {
      return {
        success: false,
        error: "This email is already registered. Please log in instead.",
      };
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1);

  const roles = ((roleRows ?? []) as { role: RoleName }[])
    .map((row) => row.role)
    .filter(Boolean);

  const { data: profile } = (await supabase
    .from("profiles")
    .select("profile_setup_completed_at")
    .eq("id", user.id)
    .single()) as {
    data: { profile_setup_completed_at: string | null } | null;
  };

  redirect(
    resolvePostAuthRedirect({
      roles,
      profile,
      redirectTo: parsed.data.redirectTo ?? null,
    }),
  );
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

export async function updateAvatarAction(
  rawInput: unknown,
): Promise<ActionResult<{ avatar_url: string | null }>> {
  const parsed = updateAvatarSchema.safeParse(rawInput);

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
        error: "You must be logged in to update your profile picture.",
      };
    }

    const expectedPrefix = `${user.id}/`;
    if (!parsed.data.storagePath.startsWith(expectedPrefix)) {
      return {
        success: false,
        error: "Invalid avatar storage path.",
      };
    }

    const { data: currentProfile } = await (supabase.from("profiles") as any)
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    const { error: updateError } = await (supabase.from("profiles") as any)
      .update({ avatar_url: parsed.data.avatarUrl })
      .eq("id", user.id);

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      };
    }

    const previousPath = getAvatarsStoragePath(currentProfile?.avatar_url);
    if (previousPath && previousPath !== parsed.data.storagePath) {
      await supabase.storage.from("avatars").remove([previousPath]);
    }

    revalidatePath("/account", "layout");

    return {
      success: true,
      data: { avatar_url: parsed.data.avatarUrl },
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }
}

export async function removeAvatarAction(): Promise<
  ActionResult<{ avatar_url: null }>
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to remove your profile picture.",
      };
    }

    const { data: currentProfile } = await (supabase.from("profiles") as any)
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    const { error: updateError } = await (supabase.from("profiles") as any)
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      };
    }

    const previousPath = getAvatarsStoragePath(currentProfile?.avatar_url);
    if (previousPath) {
      await supabase.storage.from("avatars").remove([previousPath]);
    }

    revalidatePath("/account", "layout");

    return {
      success: true,
      data: { avatar_url: null },
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

export async function deleteAccountAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse(rawInput);

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
        error: "You must be logged in to delete your account.",
      };
    }

    if (!user.email) {
      return {
        success: false,
        error: "Account deletion requires an email/password account.",
      };
    }

    const { createClient: createJSClient } = require("@supabase/supabase-js");

    const tempClient = createJSClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { error: verifyError } = await tempClient.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.password,
    });

    await tempClient.auth.signOut();

    if (verifyError) {
      return {
        success: false,
        error: "Incorrect password.",
        fieldErrors: {
          password: ["Incorrect password."],
        },
      };
    }

    const admin = createAdminClient();

    const { data: currentProfile } = await (admin.from("profiles") as any)
      .select("full_name, avatar_url, phone, status, preferences")
      .eq("id", user.id)
      .single();

    const { error: profileError } = await (admin.from("profiles") as any)
      .update({
        full_name: "Deleted User",
        avatar_url: null,
        phone: null,
        status: "suspended",
        preferences: {},
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("[deleteAccountAction] Profile anonymization failed:", profileError);
      return {
        success: false,
        error: "Account deletion failed. Please try again.",
      };
    }

    const { error: disableError } = await admin.auth.admin.updateUserById(
      user.id,
      {
        ban_duration: "876000h",
      } as any,
    );

    if (disableError) {
      console.error("[deleteAccountAction] Auth user disable failed:", disableError);

      if (currentProfile) {
        await (admin.from("profiles") as any)
          .update({
            full_name: currentProfile.full_name,
            avatar_url: currentProfile.avatar_url,
            phone: currentProfile.phone,
            status: currentProfile.status,
            preferences: currentProfile.preferences,
          })
          .eq("id", user.id);
      }

      return {
        success: false,
        error: "Account deletion failed. Please try again.",
      };
    }

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error("[deleteAccountAction] Sign-out after deletion failed:", signOutError);
    }
  } catch (error) {
    console.error("[deleteAccountAction] Unexpected deletion failure:", error);
    return {
      success: false,
      error: "Account deletion failed. Please try again.",
    };
  }

  redirect("/login");
}

export async function verifyOtpAction(tokenHash: string, type: "signup" | "email"): Promise<ActionResult> {
  try {
    await verifyOtpUseCase(tokenHash, type);
    return { success: true, data: undefined };
  } catch (error) {
    let message = toErrorMessage(error);
    const normalized = message.toLowerCase();
    
    if (normalized.includes("expired") || normalized.includes("invalid")) {
      message = "We could not verify this email. Please request a new verification email or return to login.";
    }
    
    return { success: false, error: message };
  }
}
