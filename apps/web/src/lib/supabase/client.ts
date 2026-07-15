import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@venora/database";

/**
 * Guards against a secret/service-role key ever being wired into this
 * public, bundled-into-client-JS variable. A `sb_secret_...` key here
 * bypasses RLS and would be extracted by any visitor's browser devtools
 * the moment it ships — this throws at build/render time instead of
 * silently shipping the leak.
 */
function assertPublicKey(key: string): string {
  if (key.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY holds a secret key (sb_secret_...). " +
        "This variable is bundled into public client JavaScript and must " +
        "contain only a publishable key (sb_publishable_...) or a legacy " +
        "anon-role JWT. Fix the value in your environment configuration.",
    );
  }
  return key;
}

/**
 * Client-side Supabase client (for Client Components).
 * Call this inside a Client Component — not at module level.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    assertPublicKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
  );
}
