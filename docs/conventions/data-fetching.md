# Data Fetching Conventions — Venora

> See also: [api-conventions.md](./api-conventions.md)

---

## 1. When to Use What

| Scenario | Pattern | Rationale |
|---|---|---|
| SEO page (venue list, venue detail) | Server Component + `createClient()` (server) | First-paint HTML for crawlers, no spinner |
| Authenticated list (my bookings, account) | Server Component + `createClient()` (server) | Server-side auth check, no layout shift |
| Interactive / filter-driven (search, calendar) | `useQuery` + `createClient()` (browser) | Needs client-side reactivity |
| Mutation (create booking, update profile) | Server Action + `useMutation` from TanStack Query | Type-safe, colocated, no separate API route |
| Real-time (booking status updates) | `supabase.channel().on('postgres_changes', ...)` | Supabase Realtime WebSocket |

---

## 2. TanStack Query Defaults

Set globally in `src/components/providers.tsx`:

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           60 * 1000,    // 1 minute — tuned per query in hooks
      refetchOnWindowFocus: false,        // venue data doesn't change that fast
      retry:               1,
    },
  },
})
```

### Per-query staleTime guidance

| Data | `staleTime` | Reasoning |
|---|---|---|
| Venue detail | `5 * 60 * 1000` | Changes infrequently |
| Venue listings | `2 * 60 * 1000` | New venues added regularly |
| My bookings | `30 * 1000` | Status changes often |
| Analytics | `10 * 60 * 1000` | Refreshed nightly anyway |
| User profile | `Infinity` | Updated only by the user |

---

## 3. Query Key Factory

All keys live in `src/lib/query-keys.ts`. **Never hardcode query keys inline.**

```typescript
import { queryKeys } from "@/src/lib/query-keys";

// ✅ correct
useQuery({ queryKey: queryKeys.venues.detail("the-grand-terrace") });

// ❌ wrong — key collision risk
useQuery({ queryKey: ["venue", "the-grand-terrace"] });
```

**Invalidation convention:** Invalidate by the least-specific key that covers all affected queries:

```typescript
// After creating a booking, invalidate all booking queries for this customer
queryClient.invalidateQueries({ queryKey: queryKeys.bookings.byCustomer(userId) });

// After admin approves a venue, invalidate all venue lists
queryClient.invalidateQueries({ queryKey: queryKeys.venues.all });
```

---

## 4. Optimistic Updates Pattern

Use for high-frequency interactions (favourite toggle):

```typescript
useMutation({
  mutationFn: toggleFavourite,
  onMutate: async (venueId) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.favourites.byCustomer(userId) });
    const previous = queryClient.getQueryData(queryKeys.favourites.byCustomer(userId));
    queryClient.setQueryData(
      queryKeys.favourites.byCustomer(userId),
      (old: string[]) => old.includes(venueId)
        ? old.filter((id) => id !== venueId)
        : [...old, venueId]
    );
    return { previous };
  },
  onError: (_err, _venueId, context) => {
    queryClient.setQueryData(queryKeys.favourites.byCustomer(userId), context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.favourites.byCustomer(userId) });
  },
});
```

---

## 5. Supabase Realtime

```typescript
// src/features/booking/hooks/use-booking-realtime.ts
"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";
import { queryKeys } from "@/src/lib/query-keys";

export function useBookingRealtime(customerId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`bookings:customer:${customerId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `customer_id=eq.${customerId}` },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.bookings.byCustomer(customerId),
          });
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [customerId, queryClient]);
}
```

---

## 6. Pagination

Use cursor-based pagination (not offset) for all listing queries:

```typescript
// Pass the last item's created_at as cursor
const { data } = await supabase
  .from("venues")
  .select("*")
  .eq("status", "approved")
  .order("created_at", { ascending: false })
  .lt("created_at", cursor ?? "9999-12-31")
  .limit(pageSize);
```

TanStack Query `useInfiniteQuery` for infinite scroll, `useSuspenseQuery` + manual pagination for paginated tables.
