import { DashboardSubPage, EmptyState, KpiCard, Panel } from "@/components/dashboard/enterprise";
import { getSupplierReviews } from "@/features/suppliers/application/dashboard-queries";
import { getRequiredSupplierDashboardContext } from "../_lib/supplier-dashboard-data";

export const dynamic = "force-dynamic";

export default async function SupplierReviewsPage() {
  const { supabase, profile } = await getRequiredSupplierDashboardContext();
  const reviews = profile ? await getSupplierReviews(supabase, profile.id) : [];
  const average = reviews.length ? reviews.reduce((sum: number, row: any) => sum + Number(row.overall_rating), 0) / reviews.length : 0;
  return <DashboardSubPage title="Reviews" description="See verified customer feedback from completed supplier work."><div className="grid gap-4 sm:grid-cols-2"><KpiCard label="Average Rating" value={reviews.length ? average.toFixed(1) : "-"} icon="star" highlight /><KpiCard label="Published Reviews" value={String(reviews.length)} icon="rate_review" /></div>{reviews.length === 0 ? <EmptyState icon="rate_review" title="No supplier reviews yet" description="Verified customer reviews will appear after completed supplier jobs." /> : <div className="grid gap-4 lg:grid-cols-2">{reviews.map((review: any) => <Panel key={review.id}><div className="flex items-center justify-between"><p className="font-bold text-[#0f172a]">{review.profiles?.full_name ?? "Customer"}</p><p className="font-black text-amber-600">{review.overall_rating}/5</p></div><p className="mt-4 text-sm leading-7 text-[#475569]">{review.comment || "No written comment."}</p><p className="mt-3 text-xs text-[#94a3b8]">{new Date(review.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}</p></Panel>)}</div>}</DashboardSubPage>;
}
