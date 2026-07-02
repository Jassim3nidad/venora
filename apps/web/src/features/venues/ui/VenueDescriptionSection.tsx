"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@venora/ui";

interface VenueDescriptionSectionProps {
  description: string | null;
  aiGeneratedDescription?: string | null;
}

const PREVIEW_LENGTH = 320;

export default function VenueDescriptionSection({
  description,
  aiGeneratedDescription,
}: VenueDescriptionSectionProps) {
  const body = description?.trim() || "No description provided for this venue.";
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = body.length > PREVIEW_LENGTH;
  const visibleText =
    expanded || !shouldTruncate ? body : `${body.slice(0, PREVIEW_LENGTH).trim()}…`;

  return (
    <section className="space-y-4 border-b border-[var(--border-default)] pb-8">
      <h2 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
        About this venue
      </h2>

      <p className="whitespace-pre-line text-base leading-7 text-[var(--text-secondary)]">
        {visibleText}
      </p>

      {shouldTruncate && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setExpanded((value) => !value)}
          className="h-auto px-0 text-sm font-semibold text-[var(--text-primary)] underline underline-offset-4 hover:bg-transparent"
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}

      {aiGeneratedDescription && (
        <div className="space-y-2 rounded-2xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-5 dark:from-indigo-950/20 dark:to-purple-950/20">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            AI overview
          </span>
          <p className="text-sm italic leading-relaxed text-[var(--text-secondary)]">
            &ldquo;{aiGeneratedDescription}&rdquo;
          </p>
        </div>
      )}
    </section>
  );
}
