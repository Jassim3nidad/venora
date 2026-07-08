import type { Metadata } from "next";
import {
  DashboardSubPage,
} from "@/components/dashboard/enterprise";
import { SupplierProfileForm } from "@/features/suppliers/ui/SupplierProfileForm";
import { getRequiredSupplierDashboardContext } from "../_lib/supplier-dashboard-data";

export const metadata: Metadata = { title: "Supplier Profile - Dashboard" };

export default async function SupplierProfilePage() {
  const { profile, categories } = await getRequiredSupplierDashboardContext();

  return (
    <DashboardSubPage
      title="Supplier Profile"
      description="Manage marketplace profile, service areas, accreditation-facing details, and public contact information."
    >
      <SupplierProfileForm profile={profile} categories={categories} />
    </DashboardSubPage>
  );
}
