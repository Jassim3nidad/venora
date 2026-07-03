import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import {
  DashboardSubPage,
  DashButton,
  EmptyState,
  Panel,
} from "@/components/dashboard/enterprise";

export const metadata: Metadata = { title: "Packages — Dashboard" };

export default async function PackagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <DashboardSubPage
      title="Packages"
      description="Configure venue packages, pricing, inclusions, and guest capacity."
      action={<DashButton icon="add">Add Package</DashButton>}
    >
      <Panel>
        <EmptyState
          icon="inventory_2"
          title="Package management"
          description="Manage your venue packages here. Connect packages to bookings and supplier services."
          action={<DashButton id="add-package-btn">+ Add Package</DashButton>}
        />
      </Panel>
    </DashboardSubPage>
  );
}
