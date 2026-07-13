import { notFound } from "next/navigation";
import { DashboardSubPage, Panel, StatusBadge } from "@/components/dashboard/enterprise";
import { getSupplierQuote, getOwnedSupplierInquiry } from "@/features/suppliers/application/dashboard-queries";
import { getRequiredSupplierDashboardContext } from "../../_lib/supplier-dashboard-data";
import { QuoteEditor } from "../../_components/quote-editor";

export const dynamic = "force-dynamic";

export default async function SupplierQuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ inquiryId?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { supabase, profile } = await getRequiredSupplierDashboardContext();
  if (!profile) notFound();
  const quote = id === "new" ? null : await getSupplierQuote(supabase, profile.id, id);
  const inquiryId = quote?.inquiry_id ?? query.inquiryId;
  if (!inquiryId) notFound();
  const inquiry = await getOwnedSupplierInquiry(supabase, profile.id, inquiryId);
  if (!inquiry || (id !== "new" && !quote)) notFound();
  const initial = quote ? {
    id: quote.id,
    inquiryId: quote.inquiry_id,
    title: quote.title,
    serviceDescription: quote.service_description ?? "",
    additionalFees: Number(quote.additional_fees),
    validUntil: quote.valid_until ?? "",
    terms: quote.terms ?? "",
    status: quote.status,
    items: (quote.supplier_quote_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((item: any) => ({ description: item.description, quantity: Number(item.quantity), unitPrice: Number(item.unit_price) })),
  } : undefined;
  return (
    <DashboardSubPage title={quote ? quote.title : "Create Quote"} description={`For ${inquiry.contact_name}`} action={quote ? <StatusBadge status={quote.status} /> : undefined}>
      <Panel><QuoteEditor inquiryId={inquiryId} {...(initial ? { initial } : {})} /></Panel>
    </DashboardSubPage>
  );
}
