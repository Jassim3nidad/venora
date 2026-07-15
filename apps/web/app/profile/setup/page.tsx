import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileSetupWizard } from "@/features/auth/ui/ProfileSetupWizard";
import { needsProfileSetup } from "@/lib/profile-setup";
import type { RoleName } from "@/lib/rbac/roles";

export const metadata: Metadata = {
  title: "Set Up Your Profile | Venora",
  description:
    "Complete your Venora profile to personalize venue recommendations and bookings.",
};

export const dynamic = "force-dynamic";

export default async function ProfileSetupPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/profile/setup");
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
    .select("full_name, phone, avatar_url, profile_setup_completed_at")
    .eq("id", user.id)
    .single()) as {
    data: {
      full_name: string;
      phone: string | null;
      avatar_url: string | null;
      profile_setup_completed_at: string | null;
    } | null;
  };

  if (!needsProfileSetup(roles, profile)) {
    redirect("/venues");
  }

  return (
    <>
      <div className="min-h-screen bg-[#F9FAFB] lg:bg-transparent">
        <div className="px-5 pt-5 lg:hidden">
          <Link
            href="/"
            className="text-xl font-black tracking-[-0.04em] text-[#2563EB]"
          >
            Venora
          </Link>
        </div>

        <ProfileSetupWizard
          userId={user.id}
          email={user.email ?? ""}
          initialFullName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? null}
        />
      </div>
    </>
  );
}
