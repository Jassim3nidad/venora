import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PartnerApplicationForReview = {
  id: string;
  user_id: string;
  role_applied_for: string;
  status: string;
  category: string;
  address_country: string | null;
  address_unit: string | null;
  address_building: string | null;
  address_street: string | null;
  address_district: string | null;
  address_city: string | null;
  address_zip: string | null;
  documents_json: string | null;
  denial_reason: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
};

export async function getPendingPartnerApplicationsForAdmin(): Promise<{
  applications: PartnerApplicationForReview[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { applications: null, error: "Unauthorized" };
  }

  const { data: applications, error } = await (
    supabase.from("partner_applications") as any
  )
    .select(
      `
      *,
      profiles:user_id (full_name)
    `,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return { applications: null, error: error.message };
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (adminError) {
    return {
      applications: null,
      error:
        adminError instanceof Error
          ? adminError.message
          : "Supabase admin credentials are not configured.",
    };
  }

  const enriched = await Promise.all(
    (
      (applications ?? []) as Array<
        Record<string, unknown> & {
          user_id: string;
          profiles?: { full_name: string | null } | null;
        }
      >
    ).map(async (application) => {
      const { data: authUser } = await adminClient.auth.admin.getUserById(
        application.user_id,
      );

      return {
        ...application,
        profiles: {
          full_name: application.profiles?.full_name ?? null,
          email: authUser?.user?.email ?? null,
        },
      } as PartnerApplicationForReview;
    }),
  );

  return { applications: enriched, error: null };
}
