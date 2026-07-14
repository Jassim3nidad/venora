import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardSubPage } from "@/components/dashboard/enterprise";
import { SupplierPortfolioBuilder } from "@/features/suppliers/ui/SupplierPortfolioBuilder";
import { getRequiredSupplierDashboardContext } from "../../_lib/supplier-dashboard-data";

export const metadata: Metadata = { title: "Add Portfolio Project - Dashboard" };

export default async function NewSupplierPortfolioPage() {
  const { profile } = await getRequiredSupplierDashboardContext();

  if (!profile) {
    notFound();
  }

  return (
    <DashboardSubPage
      title="Add a Portfolio Project"
      description="Show customers the quality, style, and experience behind your work."
    >
      <div className="mb-6">
        <Link 
          href="/dashboard/supplier/portfolio" 
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portfolio
        </Link>
      </div>
      <SupplierPortfolioBuilder profile={profile} />
    </DashboardSubPage>
  );
}
