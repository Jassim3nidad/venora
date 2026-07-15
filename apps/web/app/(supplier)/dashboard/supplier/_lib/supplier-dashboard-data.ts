import { redirect } from "next/navigation";
import { formatCurrency } from "@venora/lib";
import { createClient } from "@/lib/supabase/server";
import { getSupplierDashboardContext as getMarketplaceSupplierDashboardContext } from "@/features/suppliers/application/queries";
import { ROLES } from "@/lib/rbac/roles";
import type {
  SupplierCategory,
  SupplierMarketplaceProfile,
} from "@/features/suppliers/types/supplier.types";

export type SupplierProfile = {
  id: string;
  business_name: string;
  accreditation_status: string;
};

export type SupplierDashboardContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  user: { id: string; email?: string | null };
  profile: SupplierMarketplaceProfile | null;
  categories: SupplierCategory[];
  supplierProfile: SupplierProfile | null;
};

export async function getRequiredSupplierDashboardContext(): Promise<SupplierDashboardContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const roles = (roleRows ?? []).map((row: { role: string }) => row.role);
  if (!roles.includes(ROLES.SUPPLIER) && !roles.includes(ROLES.ADMIN)) {
    redirect("/unauthorized");
  }

  const context = await getMarketplaceSupplierDashboardContext(
    supabase,
    user.id,
  );
  const supplierProfile = context.profile
    ? {
        id: context.profile.id,
        business_name: context.profile.businessName,
        accreditation_status: context.profile.accreditationStatus,
      }
    : null;

  return {
    supabase,
    user,
    profile: context.profile,
    categories: context.categories,
    supplierProfile,
  };
}

export async function getSupplierDashboardContext(): Promise<SupplierDashboardContext> {
  return getRequiredSupplierDashboardContext();
}

export function formatPeso(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(Number(amount))) return "-";
  return formatCurrency(Number(amount));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}
