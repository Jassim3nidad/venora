import { createClient } from "@/lib/supabase/server";
import { AuthError } from "@/lib/errors";
import type { RoleName } from "@/lib/rbac/roles";
import type { AuthRepository } from "../domain/repositories/auth-repository.interface";
import type { AuthUser } from "../types/auth.types";

export class SupabaseAuthRepository implements AuthRepository {
  private getSiteUrl() {
    let url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
    
    // Fallback to Vercel system environment variables if explicit ones aren't set
    if (!url && process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
      url = `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (!url && process.env.NEXT_PUBLIC_VERCEL_URL) {
      url = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    } else if (!url && process.env.VERCEL_URL) {
      url = `https://${process.env.VERCEL_URL}`;
    }

    url = url ?? "http://localhost:3000";
    
    // Ensure it starts with http/https and has no trailing slash
    url = url.startsWith("http") ? url : `https://${url}`;
    return url.replace(/\/$/, "");
  }

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
    const siteUrl = this.getSiteUrl();

    // The profiles row and user_roles mapping are created automatically by the on_auth_user_created
    // trigger (see migration 003_auth_profiles.sql) — we do not need to insert them here.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/venues`,
      },
    });

    if (error) throw new AuthError(error.message);
    if (!data.user) throw new AuthError("Registration did not return a user.");

    // Supabase returns a user with empty identities[] for already-registered
    // but unverified emails (to prevent account enumeration). Detect this so
    // the UI can offer the "Resend verification" button.
    if (data.user.identities && data.user.identities.length === 0) {
      throw new AuthError("User already registered");
    }

    return { userId: data.user.id };
  }

  async signIn({ email, password }: { email: string; password: string }) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new AuthError(error.message);
  }

  async resendVerificationEmail(email: string) {
    const supabase = await createClient();
    const siteUrl = this.getSiteUrl();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/venues`,
      },
    });

    if (error) throw new AuthError(error.message);
  }

  async signInWithOAuth(provider: "google") {
    const supabase = await createClient();
    const siteUrl = this.getSiteUrl();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });
    if (error) throw new AuthError(error.message);
  }

  async signOut() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new AuthError(error.message);
  }

  async requestPasswordReset(email: string) {
    const supabase = await createClient();
    const siteUrl = this.getSiteUrl();

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

    let profileStatus = (profile?.status as any) ?? "pending_verification";

    if (profileStatus === "pending_verification" && user.email_confirmed_at) {
      const { error: profileStatusError } = await (supabase
        .from("profiles") as any)
        .update({ status: "active" })
        .eq("id", user.id);

      if (profileStatusError) {
        console.error("[auth] Failed to sync confirmed profile status:", profileStatusError);
      } else {
        profileStatus = "active";
      }
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = (roleRows ?? [])
      .map((row: any) => row.role as RoleName)
      .filter((name: any): name is RoleName => Boolean(name));

    return {
      id: user.id,
      email: user.email ?? "",
      fullName: profile?.full_name ?? "",
      avatarUrl: profile?.avatar_url ?? null,
      phone: profile?.phone ?? null,
      status: profileStatus,
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
