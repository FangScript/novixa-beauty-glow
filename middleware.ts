import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh Supabase session cookies
  const { supabaseResponse, user } = await updateSession(request);

  // Forward pathname to server components
  supabaseResponse.headers.set("x-pathname", pathname);

  // ── Admin guard ───────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const sessionCookie = request.cookies.get("novixa_admin_session")?.value;
    const isSupabaseAdmin = user?.user_metadata?.role === "ADMIN";

    // If neither a session cookie nor a verified Supabase admin token exists, redirect immediately
    if (!sessionCookie && !isSupabaseAdmin) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    // Authoritative session verification against PostgreSQL is enforced in app/admin/layout.tsx
    // and in every admin route handler via getAuthenticatedAdmin().
  }

  // ── Customer guard (Account Management) ───────────────────────────────────
  // Note: Guest checkout is permitted on /checkout; only /account requires login.
  if (pathname.startsWith("/account")) {
    const legacySession = request.cookies.get("novixa_customer_session")?.value;
    if (!user && !legacySession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
