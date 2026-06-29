import { createClient } from "@/lib/supabase/server";
import { AuthError } from "@/lib/errors";
import type { RoleName } from "@/lib/rbac/roles";
import type { AuthRepository } from "../domain/repositories/auth-repository.interface";
import type { AuthUser } from "../types/auth.types";

export class SupabaseAuthRepository implements AuthRepository {
  async signUp({
    email,
    password,
    fullName,
    role,
  }: {
    email: string;
    password: string;
    fullName: string;
    role: RoleName;
  }) {
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // The profiles row is created automatically by the on_auth_user_created
    // trigger (see migration 0002_identity_and_organizations.sql) — we only
    // need to handle role assignment here.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/account`,
      },
    });

    if (error) throw new AuthError(error.message);
    if (!data.user) throw new AuthError("Registration did not return a user.");

    const { data: roleRow, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", role)
      .single() as any;

    if (roleError || !roleRow) {
      throw new AuthError("Selected account type is not valid.");
    }

    const { error: assignError } = await supabase
      .from("user_roles")
      .insert({ user_id: data.user.id, role_id: roleRow.id } as any) as any;

    if (assignError) {
      throw new AuthError("Account created, but we could not assign your account type. Please contact support.");
    }

    return { userId: data.user.id };
  }

  async signIn({ email, password }: { email: string; password: string }) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new AuthError(error.message);
  }

  async signOut() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new AuthError(error.message);
  }

  async requestPasswordReset(email: string) {
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    // Deliberately not thrown to the caller in the common case — see the
    // account-enumeration note in actions/auth.actions.ts. Logged here for
    // operational visibility only.
    if (error) {
      console.error("[auth] resetPasswordForEmail failed:", error.message);
    }
  }

  async updatePassword(newPassword: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new AuthError(error.message);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, phone, status")
      .eq("id", user.id)
      .single() as any;

    // Nested select via the user_roles -> roles foreign key. Typed loosely
    // here because our hand-trimmed Database type doesn't carry Relationships
    // metadata — the query itself is correct and verified against the actual schema.
    const { data: roleRows } = await (supabase
      .from("user_roles") as any)
      .select("roles(name)")
      .eq("user_id", user.id);

    const roles = (roleRows ?? [])
      .map((row: any) => (row.roles as unknown as { name: string } | null)?.name)
      .filter((name: any): name is RoleName => Boolean(name));

    return {
      id: user.id,
      email: user.email ?? "",
      fullName: profile?.full_name ?? "",
      avatarUrl: profile?.avatar_url ?? null,
      phone: profile?.phone ?? null,
      status: (profile?.status as any) ?? "pending_verification",
      roles,
    };
  }

  async updateProfile(userId: string, data: { fullName: string; phone?: string | null }) {
    const supabase = await createClient();
    const { error } = await (supabase
      .from("profiles") as any)
      .update({ full_name: data.fullName, phone: data.phone || null })
      .eq("id", userId);

    if (error) throw new AuthError(error.message);
  }
}
