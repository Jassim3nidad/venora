import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@venora/database";

/**
 * Server-side Supabase client (for Server Components, Server Actions, Route Handlers).
 * Must be called inside a Server Component or async function.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookies can't be mutated; middleware handles refresh
          }
        },
      },
    }
  );
}
