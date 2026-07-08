import type { Metadata } from "next";
import { Star } from "lucide-react";
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
import { getReviewsForModeration } from "@/features/reviews/application/queries";
import { ModerationActions } from "@/features/reviews/ui/ModerationActions";
import type { ReviewForModeration } from "@/features/reviews/types/review.types";

export const metadata: Metadata = { title: "Review Moderation - Admin" };
export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam or advertising",
  offensive: "Offensive or abusive",
  fake: "Fake or misleading",
  other: "Other",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

type Props = {
  searchParams: Promise<{ all?: string }>;
};

export default async function AdminReviewsPage({ searchParams }: Props) {
  const { all } = await searchParams;
  const showAll = all === "true";

  const supabase = (await createClient()) as any;
  const reviews = await getReviewsForModeration(supabase, { onlyFlagged: !showAll });

  const columns: DataTableColumn<ReviewForModeration>[] = [
    { key: "venue", header: "Venue", cell: (row) => row.venueName },
    {
      key: "guest",
      header: "Guest",
      cell: (row) => row.profile?.fullName ?? "Anonymous Guest",
    },
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
    {
      key: "comment",
      header: "Comment",
      className: "max-w-[280px]",
      cell: (row) => (
        <span className="line-clamp-2 text-[#4b5563]">{row.comment ?? "—"}</span>
      ),
    },
    {
      key: "flags",
      header: "Flags",
      cell: (row) =>
        row.flagCount > 0 ? (
          <span className="font-semibold text-red-600">
            {row.flagCount} · {REASON_LABELS[row.topFlagReason ?? "other"]}
          </span>
        ) : (
          <span className="text-[#9ca3af]">None</span>
        ),
    },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "date", header: "Date", cell: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => <ModerationActions reviewId={row.id} status={row.status} />,
    },
  ];

  return (
    <DashboardSubPage
      title="Review Moderation"
      description={
        showAll
          ? "Browsing every review across the platform."
          : "Reviews reported by guests, sorted by number of reports."
      }
      action={
        <a
          href={showAll ? "/admin/reviews" : "/admin/reviews?all=true"}
          className="inline-flex h-10 items-center rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm font-bold text-[#111827] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
        >
          {showAll ? "Show flagged only" : "Show all reviews"}
        </a>
      }
    >
      {reviews.length > 0 ? (
        <Panel>
          <PanelHeader
            title={showAll ? "All reviews" : "Flagged reviews"}
            description="Restore a review to make it public again, or remove it permanently."
          />
          <DataTable rows={reviews} columns={columns} keyFn={(row) => row.id} />
        </Panel>
      ) : (
        <EmptyState
          icon="flag"
          title="No flagged reviews"
          description="Reviews reported by guests will appear here for moderation."
        />
      )}
    </DashboardSubPage>
  );
}
