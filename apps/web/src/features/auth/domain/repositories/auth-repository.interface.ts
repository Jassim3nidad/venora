import type { RoleName } from "@/lib/rbac/roles";
import type { AuthUser } from "../../types/auth.types";

/**
 * Domain-layer contract. application/auth.usecases.ts depends only on this
 * interface, never on Supabase directly — swapping the auth provider later
 * means writing a new class that satisfies this interface, not rewriting
 * every use-case.
 */
export interface AuthRepository {
  signUp(params: {
    email: string;
    password: string;
    fullName: string;
    role: RoleName;
  }): Promise<{ userId: string }>;

  signIn(params: { email: string; password: string }): Promise<void>;

  signInWithOAuth(provider: "google"): Promise<void>;

  signOut(): Promise<void>;

  requestPasswordReset(email: string): Promise<void>;

  updatePassword(newPassword: string): Promise<void>;

  getCurrentUser(): Promise<AuthUser | null>;

  updateProfile(userId: string, data: { fullName: string; phone?: string | null }): Promise<void>;
}
