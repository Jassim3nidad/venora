"use client";

import { Star, MessageSquare } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@venora/ui";
import { format } from "date-fns";

interface Review {
  id: string;
  overall_rating: number;
  venue_quality?: number;
  cleanliness?: number;
  staff_service?: number;
  facilities?: number;
  accessibility?: number;
  value_for_money?: number;
  ambience?: number;
  comment?: string;
  created_at: string;
  owner_reply?: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface ReviewsSectionProps {
  reviews: Review[];
  avgRating: number;
  reviewCount: number;
}

export default function ReviewsSection({
  reviews = [],
  avgRating,
  reviewCount,
}: ReviewsSectionProps) {
  // Dimension calculators
  const getDimensionAverage = (key: keyof Review) => {
    const validReviews = reviews.filter((r) => typeof r[key] === "number" && (r[key] as number) > 0);
    if (validReviews.length === 0) return 0;
    const sum = validReviews.reduce((acc, r) => acc + (r[key] as number), 0);
    return Number((sum / validReviews.length).toFixed(1));
  };

  const dimensions = [
    { label: "Cleanliness", value: getDimensionAverage("cleanliness") },
    { label: "Staff Service", value: getDimensionAverage("staff_service") },
    { label: "Facilities", value: getDimensionAverage("facilities") },
    { label: "Accessibility", value: getDimensionAverage("accessibility") },
    { label: "Value for Money", value: getDimensionAverage("value_for_money") },
    { label: "Ambience", value: getDimensionAverage("ambience") },
  ];

  const ratingPercentage = (val: number) => `${(val / 5) * 100}%`;

  return (
    <section className="space-y-8">
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] pb-4">
        <h2 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Reviews
        </h2>
        <div className="flex items-center gap-1.5 ml-4 bg-[var(--bg-subtle)] px-3 py-1 rounded-full text-sm font-semibold">
          <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
          <span className="text-[var(--text-primary)]">{avgRating.toFixed(2)}</span>
          <span className="text-[var(--text-muted)] font-normal">({reviewCount} reviews)</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)] text-center">
          <MessageSquare className="h-10 w-10 text-[var(--text-muted)] mb-3" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">No reviews yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[280px]">
            Bookings that are completed will appear here once guests leave their feedback.
          </p>
        </div>
      ) : (
        <>
          {/* Dimensions grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 bg-[var(--bg-subtle)] p-6 rounded-3xl border border-[var(--border-default)]">
            {dimensions.map((dim) => (
              <div key={dim.label} className="flex items-center justify-between text-sm py-1">
                <span className="text-[var(--text-secondary)] font-medium">{dim.label}</span>
                <div className="flex items-center gap-3 w-1/2">
                  <div className="h-1.5 w-full bg-[var(--border-default)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-brand-500)] rounded-full"
                      style={{ width: ratingPercentage(dim.value || 4.5) }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)] min-w-[20px] text-right">
                    {(dim.value || 4.5).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Reviews list */}
          <div className="space-y-6">
            {reviews.map((review) => {
              const guestName = review.profiles?.full_name || "Anonymous Guest";
              const guestAvatar = review.profiles?.avatar_url;
              const initials = guestName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={review.id}
                  className="p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-base)] space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 border-2 border-[var(--border-default)]">
                        {guestAvatar && <AvatarImage src={guestAvatar} alt={guestName} />}
                        <AvatarFallback className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-semibold text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                          {guestName}
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                          {format(new Date(review.created_at), "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < review.overall_rating
                              ? "fill-amber-400 stroke-amber-400"
                              : "fill-transparent stroke-[var(--border-default)]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {review.comment || "Great venue and host!"}
                  </p>

                  {/* Owner's reply */}
                  {review.owner_reply && (
                    <div className="bg-[var(--bg-subtle)] border-l-2 border-[var(--color-brand-500)] p-4 rounded-r-2xl space-y-2 ml-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          Response from host
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                        "{review.owner_reply}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
