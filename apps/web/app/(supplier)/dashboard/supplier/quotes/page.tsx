import Link from "next/link";
import {
  DashboardSubPage,
  EmptyState,
  Panel,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import { listSupplierQuotes } from "@/features/suppliers/application/dashboard-queries";
import { getRequiredSupplierDashboardContext } from "../_lib/supplier-dashboard-data";

export const dynamic = "force-dynamic";

export default async function SupplierQuotesPage() {
  const { supabase, profile } = await getRequiredSupplierDashboardContext();
  const quotes = profile ? await listSupplierQuotes(supabase, profile.id) : [];
  return (
    <DashboardSubPage
      title="Proposals"
      description="Create, send, and track proposals connected to customer inquiries."
    >
      {quotes.length === 0 ? (
        <EmptyState
          icon="request_quote"
          title="No proposals yet"
          description="Open an inquiry to prepare your first service proposal."
        />
      ) : (
        <Panel padding={false}>
          <div className="divide-y divide-[#e5e7eb]">
            {quotes.map((quote: any) => (
              <Link
                key={quote.id}
                href={`/dashboard/supplier/quotes/${quote.id}`}
                className="flex flex-col gap-3 p-5 transition hover:bg-[#f8fbff] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-bold text-[#0f172a]">{quote.title}</p>
                  <p className="mt-1 text-sm text-[#64748b]">
                    {quote.supplier_contact_requests?.contact_name ??
                      "Customer"}{" "}
                    ·{" "}
                    {quote.supplier_contact_requests?.event_date ??
                      "Date not set"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={quote.status} />
                  <p className="font-black text-[#0f172a]">
                    ₱{Number(quote.total).toLocaleString("en-PH")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </DashboardSubPage>
  );
}
