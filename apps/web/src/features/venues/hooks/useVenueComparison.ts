"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "venora_venue_comparison_ids";
const MAX_LIMIT = 4;

export function useVenueComparison() {
  const [venueIds, setVenueIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setVenueIds(JSON.parse(stored));
      }
    } catch {
      // Ignore read errors
    }
  }, []);

  const saveVenueIds = useCallback((newIds: string[]) => {
    setVenueIds(newIds);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds));
      window.dispatchEvent(new Event("venora_comparison_change"));
    } catch {
      // Ignore write errors
    }
  }, []);

  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        setVenueIds(stored ? JSON.parse(stored) : []);
      } catch {
        setVenueIds([]);
      }
    };
    window.addEventListener("venora_comparison_change", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("venora_comparison_change", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const addVenueId = useCallback(
    (id: string): { success: boolean; reason?: string } => {
      if (venueIds.includes(id)) {
        return { success: true };
      }
      if (venueIds.length >= MAX_LIMIT) {
        return {
          success: false,
          reason: `You can compare up to ${MAX_LIMIT} venues at a time.`,
        };
      }
      saveVenueIds([...venueIds, id]);
      return { success: true };
    },
    [venueIds, saveVenueIds]
  );

  const removeVenueId = useCallback(
    (id: string) => {
      saveVenueIds(venueIds.filter((vId) => vId !== id));
    },
    [venueIds, saveVenueIds]
  );

  const clearComparison = useCallback(() => {
    saveVenueIds([]);
  }, [saveVenueIds]);

  const isInComparison = useCallback(
    (id: string): boolean => {
      return venueIds.includes(id);
    },
    [venueIds]
  );

  return {
    venueIds,
    maxLimit: MAX_LIMIT,
    addVenueId,
    removeVenueId,
    clearComparison,
    isInComparison,
  };
}
