import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupplierDashboardContext } from "@/features/suppliers/application/queries";

export async function getRequiredSupplierDashboardContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const context = await getSupplierDashboardContext(supabase, user.id);

  return {
    supabase,
    user,
    ...context,
  };
}
