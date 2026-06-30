import { ROLES, type RoleName } from "@/lib/rbac/roles";
import { ForbiddenError } from "@/lib/errors";
import { SupabaseAuthRepository } from "../infrastructure/supabase-auth.repository";

// Single instance — stateless, just wraps the Supabase client per call.
const repository = new SupabaseAuthRepository();

export async function registerUserUseCase(input: {
  email: string;
  password: string;
  fullName: string;
  role: RoleName;
}) {
  // Defense in depth: the registration schema's enum already excludes
  // 'admin' from the selectable options, so this should be unreachable from
  // the UI — but a use-case shouldn't trust that its only caller is the form.
  if (input.role === ROLES.ADMIN) {
    throw new ForbiddenError("Administrator accounts cannot be created through public registration.");
  }

  return repository.signUp(input);
}

export async function authenticateUserUseCase(input: { email: string; password: string }) {
  return repository.signIn(input);
}

export async function signInWithOAuthUseCase(provider: "google") {
  return repository.signInWithOAuth(provider);
}

export async function signOutUseCase() {
  return repository.signOut();
}

export async function requestPasswordResetUseCase(email: string) {
  // Always succeeds from the caller's point of view — see
  // actions/auth.actions.ts for why the response must not reveal whether
  // the email is registered.
  return repository.requestPasswordReset(email);
}

export async function resetPasswordUseCase(newPassword: string) {
  return repository.updatePassword(newPassword);
}

export async function getCurrentUserUseCase() {
  return repository.getCurrentUser();
}

export async function updateProfileUseCase(userId: string, data: { fullName: string; phone?: string | null }) {
  return repository.updateProfile(userId, data);
}
