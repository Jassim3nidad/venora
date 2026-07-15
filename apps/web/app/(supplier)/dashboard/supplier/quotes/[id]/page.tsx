import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardPage, StatusBadge } from "@/components/dashboard/enterprise";
import {
  getSupplierQuote,
  getOwnedSupplierInquiry,
} from "@/features/suppliers/application/dashboard-queries";
import { getRequiredSupplierDashboardContext } from "../../_lib/supplier-dashboard-data";
import { QuoteEditor } from "../../_components/quote-editor";

export const dynamic = "force-dynamic";

export default async function SupplierQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inquiryId?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase, profile } = await getRequiredSupplierDashboardContext();
  if (!profile) notFound();

  const quote =
    id === "new" ? null : await getSupplierQuote(supabase, profile.id, id);
  const inquiryId = quote?.inquiry_id ?? query.inquiryId;
  if (!inquiryId) notFound();

  const inquiry = await getOwnedSupplierInquiry(
    supabase,
    profile.id,
    inquiryId,
  );
  if (!inquiry || (id !== "new" && !quote)) notFound();

  const initial = quote
    ? {
        id: quote.id,
        inquiryId: quote.inquiry_id,
        title: quote.title,
        serviceDescription: quote.service_description ?? "",
        additionalFees: Number(quote.additional_fees),
        validUntil: quote.valid_until ?? "",
        terms: quote.terms ?? "",
        status: quote.status,
        items: (quote.supplier_quote_items ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((item: any) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
          })),
      }
    : undefined;

  const serviceName = inquiry.supplier_services?.name ?? "Service";
  const customerName = inquiry.contact_name ?? "Customer";

  return (
    <DashboardPage>
      <div className="mb-6 space-y-4">
        <Link
          href={`/dashboard/supplier/inquiries/${inquiryId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#64748b] transition hover:text-[#0f172a]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inquiry
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-[#0f172a]">
                {quote ? quote.title : "Create Service Proposal"}
              </h1>
              <StatusBadge status={quote ? quote.status : "draft"} />
            </div>
            <p className="mt-1 text-sm font-semibold text-[#0f172a]">
              {serviceName} for {customerName}
            </p>
            <p className="mt-1 text-sm font-medium text-[#64748b]">
              {[
                inquiry.venue_name_snapshot ||
                  inquiry.location_snapshot ||
                  inquiry.event_location,
                inquiry.event_date_snapshot || inquiry.event_date,
                inquiry.guest_count_snapshot || inquiry.guest_count
                  ? `${inquiry.guest_count_snapshot || inquiry.guest_count} guests`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </div>
      <QuoteEditor inquiry={inquiry} {...(initial ? { initial } : {})} />
    </DashboardPage>
  );
}
