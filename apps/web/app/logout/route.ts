import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /logout
 * Log out the user by signing out of Supabase and clearing local auth cookies,
 * then redirecting back to the homepage.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const homeUrl = new URL("/", request.url);
  const response = NextResponse.redirect(homeUrl);

  // Explicitly clear all chunked auth cookies to ensure the session is destroyed locally
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  allCookies.forEach((c) => {
    if (c.name.startsWith("sb-") || c.name.includes("auth-token")) {
      // 1. Delete from cookieStore
      cookieStore.delete(c.name);

      // 2. Delete from response cookie manager
      response.cookies.set(c.name, "", {
        path: "/",
        maxAge: -1,
      });
    }
  });

  return response;
}
