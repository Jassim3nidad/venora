import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolvePostAuthRedirect } from "@/lib/profile-setup";
import type { RoleName } from "@/lib/rbac/roles";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const redirectTo =
    typeof params.next === "string"
      ? params.next
      : typeof params.redirectTo === "string"
        ? params.redirectTo
        : null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

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

    redirect(resolvePostAuthRedirect({ roles, profile, redirectTo }));
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
