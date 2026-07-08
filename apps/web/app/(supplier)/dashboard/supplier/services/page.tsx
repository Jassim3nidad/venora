import type { Metadata } from "next";
import {
  DashboardSubPage,
  DashButton,
  EmptyState,
} from "@/components/dashboard/enterprise";
import { SupplierPackageManager } from "@/features/suppliers/ui/SupplierPackageManager";
import { getRequiredSupplierDashboardContext } from "../_lib/supplier-dashboard-data";

export const metadata: Metadata = { title: "Services - Supplier Dashboard" };
export const dynamic = "force-dynamic";

export default async function SupplierServicesPage() {
  const { profile } = await getRequiredSupplierDashboardContext();

  return (
    <DashboardSubPage
      title="Services & Packages"
      description="Create pricing packages, guest ranges, inclusions, and active marketplace offers."
    >
      {profile ? (
        <SupplierPackageManager profile={profile} />
      ) : (
        <EmptyState
          icon="storefront"
          title="Create your supplier profile first"
          description="Packages need an owner profile before they can appear in marketplace search."
          action={
            <DashButton href="/dashboard/supplier/profile" icon="storefront">
              Set Up Profile
            </DashButton>
          }
        />
      )}
    </DashboardSubPage>
  );
}
