import { cache } from "react";
import { createClient } from "./server";

/**
 * Resolves the current request's Supabase client + authenticated user,
 * memoized via React's cache() so every caller within the same
 * render/request (layout, page, nested Server Component, Server Action)
 * shares one auth.getUser() verification instead of each re-checking the
 * session independently. Safe to call from as many places as needed —
 * only Server Components/Actions/Route Handlers within a single request
 * share the cache; it resets between requests.
 */
export const getCurrentAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});
