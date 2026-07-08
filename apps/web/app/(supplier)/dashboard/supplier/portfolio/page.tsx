import type { Metadata } from "next";
import {
  DashboardSubPage,
  DashButton,
  EmptyState,
} from "@/components/dashboard/enterprise";
import { SupplierPortfolioManager } from "@/features/suppliers/ui/SupplierPortfolioManager";
import { getRequiredSupplierDashboardContext } from "../_lib/supplier-dashboard-data";

export const metadata: Metadata = { title: "Supplier Portfolio - Dashboard" };

export default async function SupplierPortfolioPage() {
  const { profile } = await getRequiredSupplierDashboardContext();

  return (
    <DashboardSubPage
      title="Portfolio"
      description="Publish work samples that help customers compare event style, scope, and production quality."
    >
      {profile ? (
        <SupplierPortfolioManager profile={profile} />
      ) : (
        <EmptyState
          icon="photo_library"
          title="Create your supplier profile first"
          description="Portfolio work needs an owner profile before it can appear on supplier pages."
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
