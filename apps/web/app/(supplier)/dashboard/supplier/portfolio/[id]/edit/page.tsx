import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardSubPage } from "@/components/dashboard/enterprise";
import { SupplierPortfolioBuilder } from "@/features/suppliers/ui/SupplierPortfolioBuilder";
import { getRequiredSupplierDashboardContext } from "../../../_lib/supplier-dashboard-data";

export const metadata: Metadata = { title: "Edit Portfolio Project - Dashboard" };

type EditPortfolioPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditSupplierPortfolioPage({
  params,
}: EditPortfolioPageProps) {
  const { id } = await params;
  const { profile } = await getRequiredSupplierDashboardContext();

  if (!profile) {
    notFound();
  }

  const existingProject = profile.portfolio.find((p) => p.id === id);

  if (!existingProject) {
    notFound();
  }

  return (
    <DashboardSubPage
      title="Edit Portfolio Project"
      description="Update your project photos, details, and visibility."
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
      <SupplierPortfolioBuilder profile={profile} existingProject={existingProject} />
    </DashboardSubPage>
  );
}
