import type { Metadata } from "next";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashButton, DashboardSubPage, Panel } from "@/components/dashboard/enterprise/ui";
import { MaterialIcon } from "@/components/dashboard/enterprise/MaterialIcon";

export const metadata: Metadata = { title: "Packages — Dashboard" };

export default async function PackagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <DashboardSubPage
      title="Packages & Pricing"
      description="Configure package prices, inclusions, guest capacity, and supplier participation."
      action={
        <DashButton id="add-package-btn">
          <MaterialIcon name="add" className="text-[18px]" />
          Add Package
        </DashButton>
      }
    >
      <Panel className="border-dashed bg-[#fafbfc] py-16 text-center">
        <MaterialIcon name="inventory_2" className="mx-auto mb-3 text-[32px] text-[#9a442d]" />
        <p className="font-display text-lg font-semibold">No packages yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#565e74]">
          Create your first venue package to start accepting bookings with structured pricing.
        </p>
      </Panel>
    </DashboardSubPage>
  );
}
