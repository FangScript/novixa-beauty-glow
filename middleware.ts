import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh Supabase session cookies
  const { supabaseResponse, user } = await updateSession(request);

  // ── Admin guard ───────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const sessionCookie = request.cookies.get("novixa_admin_session")?.value;
    const isAdmin = Boolean(sessionCookie) || user?.user_metadata?.role === "ADMIN";
    if (!isAdmin) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Customer guard ────────────────────────────────────────────────────────
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
