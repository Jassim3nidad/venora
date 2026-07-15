import type { Metadata } from "next";
import { Star } from "lucide-react";
import {
  DashboardSubPage,
  DataTable,
  EmptyState,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import {
  getOwnerDashboardContext,
  getOwnerVenueIds,
  formatDate,
} from "../_lib/owner-dashboard-data";
import {
  getOwnerReviewsForVenues,
  getReviewAnalytics,
} from "@/features/reviews/application/queries";
import { OwnerReplyForm } from "@/features/reviews/ui/OwnerReplyForm";
import type { ReviewForModeration } from "@/features/reviews/types/review.types";

export const metadata: Metadata = { title: "Reviews - Dashboard" };
export const dynamic = "force-dynamic";

export default async function OwnerReviewsPage() {
  const context = await getOwnerDashboardContext();
  const venueIds = await getOwnerVenueIds(context);

  const [reviews, analytics] = await Promise.all([
    getOwnerReviewsForVenues(context.supabase, venueIds),
    getReviewAnalytics(context.supabase, venueIds),
  ]);

  const columns: DataTableColumn<ReviewForModeration>[] = [
    {
      key: "guest",
      header: "Guest",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">
          {row.profile?.fullName ?? "Anonymous Guest"}
        </span>
      ),
    },
    { key: "venue", header: "Venue", cell: (row) => row.venueName },
    {
      key: "rating",
      header: "Rating",
      cell: (row) => (
        <span className="inline-flex items-center gap-1 font-semibold text-[#111827]">
          <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
          {row.overallRating}
        </span>
      ),
    },
    { key: "date", header: "Date", cell: (row) => formatDate(row.createdAt) },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={row.status} />
          {row.flagCount > 0 ? (
            <span className="text-xs font-semibold text-red-600">
              {row.flagCount} report{row.flagCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "reply",
      header: "Reply",
      className: "min-w-[280px]",
      cell: (row) => (
        <OwnerReplyForm
          reviewId={row.id}
          existingReply={row.ownerReply ?? null}
        />
      ),
    },
  ];

  return (
    <DashboardSubPage
      title="Reviews"
      description="See what guests are saying about your venues, reply publicly, and track review performance."
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Average Rating"
          value={analytics.averageRating.toFixed(2)}
          icon="star"
        />
        <KpiCard
          label="Total Reviews"
          value={String(analytics.totalReviews)}
          icon="rate_review"
        />
        <KpiCard
          label="Needs Attention"
          value={String(analytics.flaggedCount)}
          icon="flag"
        />
        <KpiCard
          label="Helpful Votes"
          value={String(analytics.helpfulVotesTotal)}
          icon="thumb_up"
        />
      </div>

      {analytics.totalReviews > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              title="Rating distribution"
              description="How guests are rating your venues."
            />
            <div className="grid gap-3">
              {[...analytics.ratingDistribution].reverse().map((bucket) => (
                <div
                  key={bucket.rating}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="w-10 shrink-0 font-semibold text-[#111827]">
                    {bucket.rating} star
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eff6ff]">
                    <div
                      className="h-full rounded-full bg-[#1d4ed8]"
                      style={{
                        width: `${analytics.totalReviews > 0 ? (bucket.count / analytics.totalReviews) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-semibold text-[#4b5563]">
                    {bucket.count}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Dimension averages"
              description="Average score across review categories."
            />
            <div className="grid gap-3">
              {analytics.dimensionAverages
                .filter((dimension) => dimension.value > 0)
                .map((dimension) => (
                  <div
                    key={dimension.key}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-32 shrink-0 font-semibold text-[#111827]">
                      {dimension.label}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eff6ff]">
                      <div
                        className="h-full rounded-full bg-[#1d4ed8]"
                        style={{ width: `${(dimension.value / 5) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-semibold text-[#4b5563]">
                      {dimension.value.toFixed(1)}
                    </span>
                  </div>
                ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <Panel>
          <PanelHeader
            title="All reviews"
            description="Reviews across every venue you manage."
          />
          <DataTable rows={reviews} columns={columns} keyFn={(row) => row.id} />
        </Panel>
      ) : (
        <EmptyState
          icon="rate_review"
          title="No reviews yet"
          description="Reviews will appear here once guests review your venues."
        />
      )}
    </DashboardSubPage>
  );
}
