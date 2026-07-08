import type { Metadata } from "next";
import {
  DashboardSubPage,
  EmptyState,
  Panel,
  PanelHeader,
} from "@/components/dashboard/enterprise";
import {
  formatPeso,
  getSupplierDashboardContext,
} from "../_lib/supplier-dashboard-data";
import { AddServiceForm, DeleteServiceButton } from "../_components/service-form";

export const metadata: Metadata = { title: "Services - Supplier Dashboard" };
export const dynamic = "force-dynamic";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  price_unit: string | null;
};

export default async function SupplierServicesPage() {
  const { supabase, supplierProfile } = await getSupplierDashboardContext();

  if (!supplierProfile) {
    return (
      <DashboardSubPage title="Services" description="Set up your supplier profile first.">
        <EmptyState
          icon="storefront"
          title="Profile setup pending"
          description="Create your supplier profile from the overview page to start listing services."
        />
      </DashboardSubPage>
    );
  }

  const { data: services } = await supabase
    .from("supplier_services")
    .select("id, name, description, price, price_unit")
    .eq("supplier_id", supplierProfile.id)
    .order("created_at", { ascending: false });

  const rows = (services ?? []) as ServiceRow[];

  return (
    <DashboardSubPage
      title="Services"
      description="Manage the service packages clients and venue partners can discover."
    >
      <Panel>
        <PanelHeader
          title="Add a New Service"
          description="Services appear on your supplier profile and in venue coordination requests."
        />
        <AddServiceForm />
      </Panel>

      <Panel>
        <PanelHeader
          title="Your Services"
          description={`${rows.length} service${rows.length === 1 ? "" : "s"} listed.`}
        />
        {rows.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((service) => (
              <div
                key={service.id}
                className="flex flex-col gap-3 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4"
              >
                <div>
                  <p className="font-semibold text-[#111827]">{service.name}</p>
                  {service.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-[#6b7280]">
                      {service.description}
                    </p>
                  ) : null}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#111827]">
                      {service.price ? formatPeso(service.price) : "Contact for price"}
                    </p>
                    {service.price_unit ? (
                      <p className="text-xs text-[#6b7280]">
                        {service.price_unit.replace(/_/g, " ")}
                      </p>
                    ) : null}
                  </div>
                  <DeleteServiceButton serviceId={service.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="inventory_2"
            title="No services yet"
            description="Add your first service package above to get discovered by venue owners and customers."
          />
        )}
      </Panel>
    </DashboardSubPage>
  );
}
