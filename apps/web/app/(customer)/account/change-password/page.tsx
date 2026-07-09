import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChangePasswordForm from "../_components/change-password-form";

export const metadata: Metadata = {
  title: "Change Password",
};

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <ChangePasswordForm />;
}
