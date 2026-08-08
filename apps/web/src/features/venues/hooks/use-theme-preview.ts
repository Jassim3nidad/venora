"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CUSTOM_THEME,
  customPromptCacheKey,
  type ThemeSelection,
} from "@venora/lib";
import { queryKeys } from "@/lib/query-keys";
import { generateThemePreview } from "../api/theme-preview.client";
import type { GenerateThemePreviewResponse } from "../schemas/theme-preview.schema";

/** Poll cadence for the rare case where a concurrent request is mid-generation. */
const PENDING_POLL_MS = 4_000;
const MAX_PENDING_POLLS = 5;

export interface ThemeRequest {
  theme: ThemeSelection;
  /** Sanitised text; required for `custom`, must be null otherwise. */
  customPrompt: string | null;
}

/**
 * Fetches (and caches for the session) one themed render of a venue photo.
 *
 * React Query's cache is the per-session store the feature needs: each
 * (photo, theme, prompt) triple gets its own key with `staleTime: Infinity`,
 * so returning to an already-viewed theme — including a custom one the
 * visitor typed earlier — re-renders straight from memory and never
 * re-invokes the Edge Function.
 */
export function useThemePreview(
  venueId: string,
  photoId: string,
  request: ThemeRequest | null,
) {
  // Keyed per selection so switching doesn't inherit another one's count.
  const pollCounts = useRef<Record<string, number>>({});

  const theme = request?.theme ?? null;
  const customPrompt = request?.customPrompt ?? null;
  // Matches the Edge Function's own cache key, so the same words in a
  // different casing hit the same client-side entry too.
  const promptKey = customPrompt ? customPromptCacheKey(customPrompt) : "";
  const selectionKey = `${theme ?? "none"}:${promptKey}`;

  return useQuery<GenerateThemePreviewResponse>({
    queryKey: queryKeys.ai.themePreview(photoId, theme ?? "none", promptKey),
    enabled: Boolean(theme) && (theme !== CUSTOM_THEME || Boolean(customPrompt)),
    queryFn: () =>
      generateThemePreview({ venueId, photoId, theme: theme!, customPrompt }),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (query.state.data?.preview.status !== "pending") return false;

      const attempts = (pollCounts.current[selectionKey] ?? 0) + 1;
      pollCounts.current[selectionKey] = attempts;

      return attempts <= MAX_PENDING_POLLS ? PENDING_POLL_MS : false;
    },
  });
}
