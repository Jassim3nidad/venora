import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /logout
 * Log out the user by signing out of Supabase and clearing local auth cookies,
 * then redirecting back to the homepage.
 */
export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const loginUrl = new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  const response = NextResponse.redirect(loginUrl);
  
  // Explicitly clear all chunked auth cookies to ensure the session is destroyed locally
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const host = supabaseUrl.split("//")[1] || "";
  const projectRef = host.split(".")[0] || "";
  const cookieName = `sb-${projectRef}-auth-token`;
  
  console.log("[LOGOUT] Supabase URL:", supabaseUrl);
  console.log("[LOGOUT] Expected Cookie Name Prefix:", cookieName);
  
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log("[LOGOUT] Incoming Cookie Names:", allCookies.map(c => c.name));
  
  allCookies.forEach((c) => {
    if (c.name.startsWith("sb-") || c.name.includes("auth-token")) {
      console.log("[LOGOUT] Deleting cookie:", c.name);
      
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
