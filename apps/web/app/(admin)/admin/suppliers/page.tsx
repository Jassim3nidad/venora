import type { Metadata } from "next";
import {
  DashboardSubPage,
  DataTable,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Suppliers - Admin" };

type SupplierRow = {
  id: string;
  business_name: string;
  accreditation_status: string;
  avg_rating: number;
  review_count: number;
  created_at: string;
};

type SupplierDisplayRow = {
  id: string;
  name: string;
  status: string;
  rating: string;
  added: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export default async function AdminSuppliersPage() {
  const supabase = (await createClient()) as any;
  const { data: suppliers } = await supabase
    .from("supplier_profiles")
    .select("id, business_name, accreditation_status, avg_rating, review_count, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows: SupplierDisplayRow[] = ((suppliers ?? []) as SupplierRow[]).map(
    (supplier) => ({
      id: supplier.id,
      name: supplier.business_name,
      status: supplier.accreditation_status,
      rating:
        supplier.review_count > 0
          ? `${Number(supplier.avg_rating).toFixed(1)} (${supplier.review_count})`
          : "No reviews",
      added: formatDate(supplier.created_at),
    }),
  );

  const columns: DataTableColumn<SupplierDisplayRow>[] = [
    {
      key: "supplier",
      header: "Supplier",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">{row.name}</span>
      ),
    },
    {
      key: "status",
      header: "Accreditation",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    { key: "rating", header: "Rating", cell: (row) => row.rating },
    { key: "added", header: "Added", cell: (row) => row.added },
  ];

  return (
    <DashboardSubPage
      title="Supplier Accreditation"
      description="Review supplier profiles and accreditation status."
    >
      {rows.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Supplier Profiles"
            description="Showing the latest supplier profile records."
          />
          <DataTable rows={rows} columns={columns} keyFn={(row) => row.id} />
        </Panel>
      ) : (
        <EmptyState
          icon="storefront"
          title="No suppliers yet"
          description="Supplier profiles will appear here after suppliers complete onboarding."
        />
      )}
    </DashboardSubPage>
  );
}
