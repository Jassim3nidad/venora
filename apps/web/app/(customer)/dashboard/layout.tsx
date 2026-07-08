import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNavbarProfile } from "@/lib/get-navbar-profile";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";

export default async function CustomerDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/dashboard/customer");

  const profile = await getNavbarProfile(supabase, user.id);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <CustomerNavbar user={user} profile={profile} />
      {children}
    </div>
  );
}
