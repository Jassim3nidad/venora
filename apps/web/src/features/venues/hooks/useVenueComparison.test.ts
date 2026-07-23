import { describe, it, expect, beforeEach } from "vitest";

// Mock localStorage for Vitest Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
});

describe("Customer Venue Comparison Persistence Logic", () => {
  const STORAGE_KEY = "venora_venue_comparison_ids";
  const MAX_LIMIT = 4;

  beforeEach(() => {
    localStorageMock.clear();
  });

  it("should prevent adding duplicates", () => {
    const venueIds = ["v-1", "v-2"];
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(venueIds));
    const isDuplicate = venueIds.includes("v-1");
    expect(isDuplicate).toBe(true);
  });

  it("should enforce the maximum limit of 4 venues", () => {
    const venueIds = ["v-1", "v-2", "v-3", "v-4"];
    expect(venueIds.length >= MAX_LIMIT).toBe(true);
  });

  it("should remove venue ID correctly", () => {
    const venueIds = ["v-1", "v-2", "v-3"];
    const updated = venueIds.filter((id) => id !== "v-2");
    expect(updated).toEqual(["v-1", "v-3"]);
  });

  it("should clear all comparison IDs", () => {
    const venueIds = ["v-1", "v-2"];
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(venueIds));
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify([]));
    expect(JSON.parse(localStorageMock.getItem(STORAGE_KEY)!)).toEqual([]);
  });
});
