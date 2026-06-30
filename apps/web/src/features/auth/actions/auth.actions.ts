"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../schemas/auth.schema";
import {
  registerUserUseCase,
  authenticateUserUseCase,
  signInWithOAuthUseCase,
  signOutUseCase,
  requestPasswordResetUseCase,
  resetPasswordUseCase,
  updateProfileUseCase,
  getCurrentUserUseCase,
} from "../application/auth.usecases";
import type { ActionResult } from "../types/auth.types";
import { defaultRouteForRoles, type RoleName } from "@/lib/rbac/roles";
import { toErrorMessage } from "@/lib/errors";

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
    const { userId } = await registerUserUseCase({
      email: parsed.data.email,
      password: parsed.data.password,
      fullName: parsed.data.fullName,
      role: parsed.data.role as RoleName,
    });
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }

  // Registrations succeed and redirect to login or check-email
  redirect("/login?registered=true");
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
    return {
      success: false,
      error: toErrorMessage(error),
    };
  }

  // Get current user to decide where to redirect
  let targetPath = "/account";
  try {
    const user = await getCurrentUserUseCase();
    if (user && user.roles.length > 0) {
      targetPath = defaultRouteForRoles(user.roles);
    }
  } catch (err) {
    console.error("[loginAction] Could not resolve roles post-login:", err);
  }

  redirect(targetPath);
}

export async function signInWithOAuthAction(provider: "google"): Promise<ActionResult> {
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

  redirect("/login");
}

export async function forgotPasswordAction(rawInput: unknown): Promise<ActionResult> {
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
    // Deliberately swallow errors here to prevent account enumeration
    console.error("[forgotPasswordAction] Password reset request error (swallowed):", error);
  }

  return {
    success: true,
    data: undefined,
  };
}

export async function resetPasswordAction(rawInput: unknown): Promise<ActionResult> {
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

  redirect("/login?reset=true");
}

export async function updateProfileAction(rawInput: unknown): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(rawInput);
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
        error: "You must be logged in to update your profile.",
      };
    }

    await updateProfileUseCase(user.id, {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
    });

    revalidatePath("/account");
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
