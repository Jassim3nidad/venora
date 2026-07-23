import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Star, Store } from "lucide-react";
import {
  CustomerCard,
  CustomerLinkButton,
  CustomerPageHeader,
} from "@/src/components/customer/CustomerUI";
import { createClient } from "@/lib/supabase/server";
import { getCustomerInquiryDetails } from "@/src/features/suppliers/application/customer-queries";
import { getSupplierReviewState } from "@/src/features/suppliers/application/customer-inquiry.logic";
import { SupplierReviewForm } from "@/src/features/suppliers/ui/SupplierReviewForm";

export const metadata: Metadata = {
  title: "Review Supplier | Venora",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

function firstRelated(value: any) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatDate(value?: string | null) {
  if (!value) return "Date pending";
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Date pending";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date);
}

export default async function SupplierInquiryReviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirectTo=/inquiries/${id}/review`);

  const data = await getCustomerInquiryDetails(supabase, user.id, id);
  if (!data.inquiry) notFound();

  const supplier = data.inquiry.supplier_profiles;
  const service = data.inquiry.supplier_services;
  const booking = data.inquiry.bookings;
  const supplierJob = data.supplierJob;
  const supplierJobBooking = firstRelated(supplierJob?.bookings);
  const existingReview = firstRelated(supplierJob?.supplier_reviews);
  const reviewState = getSupplierReviewState({
    quoteStatus: data.quote?.status,
    jobStatus: supplierJob?.status,
    bookingStatus: supplierJobBooking?.status ?? booking?.status,
    reviewId: existingReview?.id,
    hasLinkedBooking: Boolean(data.inquiry.booking_id ?? booking?.id),
  });
  const supplierName = supplier?.business_name ?? "your supplier";
  const serviceName = service?.name ?? "Supplier service";
  const eventDate =
    data.inquiry.event_date_snapshot ??
    data.inquiry.event_date ??
    booking?.event_date;

  return (
    <div className="bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href={`/inquiries/${id}`}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to supplier inquiry
        </Link>

        <CustomerPageHeader
          eyebrow="Supplier review"
          icon={Store}
          title={`Review ${supplierName}`}
          description={`${serviceName} - Event date: ${formatDate(eventDate)}`}
        />

        <CustomerCard className="p-5 sm:p-6">
          {reviewState.canReview ? (
            <SupplierReviewForm inquiryId={id} />
          ) : existingReview ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-5 text-[#1D4ED8]">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em]">
                  Review submitted
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {existingReview.overall_rating} stars
                </p>
                {existingReview.comment ? (
                  <p className="mt-3 text-sm font-semibold leading-6">
                    {existingReview.comment}
                  </p>
                ) : null}
              </div>
              <CustomerLinkButton href={`/inquiries/${id}`}>
                View Inquiry
              </CustomerLinkButton>
            </div>
          ) : (
            <div className="grid gap-4">
              <p className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5 text-sm font-semibold leading-6 text-slate-600">
                {reviewState.description}
              </p>
              <CustomerLinkButton href={`/inquiries/${id}`} tone="secondary">
                View Inquiry
              </CustomerLinkButton>
            </div>
          )}
        </CustomerCard>

        {!reviewState.canReview && !existingReview ? (
          <p className="flex items-start gap-2 text-sm font-medium leading-6 text-slate-500">
            <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            Supplier reviews use the same timing rule as venue reviews: the
            linked venue booking must be completed first.
          </p>
        ) : null}
      </div>
    </div>
  );
}
