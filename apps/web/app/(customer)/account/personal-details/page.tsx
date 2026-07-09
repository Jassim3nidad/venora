import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PersonalDetailsForm from "../_components/personal-details-form";

export const metadata: Metadata = {
  title: "Personal Details",
};

export const dynamic = "force-dynamic";

export default async function PersonalDetailsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("full_name, avatar_url, phone")
    .eq("id", user.id)
    .single()) as any;

  return (
    <PersonalDetailsForm
      userId={user.id}
      initialFullName={profile?.full_name ?? ""}
      initialPhone={profile?.phone ?? ""}
      initialAvatarUrl={profile?.avatar_url ?? null}
    />
  );
}
