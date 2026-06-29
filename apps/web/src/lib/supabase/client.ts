import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@venora/database";

/**
 * Client-side Supabase client (for Client Components).
 * Call this inside a Client Component — not at module level.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
