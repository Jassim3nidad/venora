import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export type SupplierProfile = {
  id: string;
  business_name: string;
  accreditation_status: string;
};

export type SupplierDashboardContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  user: { id: string; email?: string | null };
  supplierProfile: SupplierProfile | null;
};

export async function getSupplierDashboardContext(): Promise<SupplierDashboardContext> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: supplierProfile } = await supabase
    .from("supplier_profiles")
    .select("id, business_name, accreditation_status")
    .eq("profile_id", user.id)
    .maybeSingle();

  return { supabase, user, supplierProfile: supplierProfile ?? null };
}

export function formatPeso(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(Number(amount))) return "-";
  return `PHP ${Number(amount).toLocaleString("en-PH")}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}
