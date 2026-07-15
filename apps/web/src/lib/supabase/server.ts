import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@venora/database";

/**
 * Guards against a secret/service-role key ever being wired into this
 * RLS-scoped variable — see src/lib/supabase/client.ts for why.
 */
function assertPublicKey(key: string): string {
  if (key.startsWith("sb_secret_")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY holds a secret key (sb_secret_...). " +
        "This client is meant to run with RLS enforced under the caller's " +
        "session, not with a key that bypasses it. Fix the value in your " +
        "environment configuration.",
    );
  }
  return key;
}

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

/**
 * Server-side Supabase client
 * Used for Server Components, Server Actions, and Route Handlers.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    assertPublicKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({
                name,
                value,
                ...options,
              });
            });
          } catch {
            // This can happen in Server Components.
            // Middleware will handle refreshing the session.
          }
        },
      },
    },
  );
}
