import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAllowedMutation } from "@/lib/security/request";
export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;
  if (
    pathname.startsWith("/api/") &&
    pathname !== "/api/payments/webhook" &&
    !isAllowedMutation(request, process.env.APP_URL)
  ) {
    return NextResponse.json(
      { error: "Cross-origin mutations are not permitted." },
      { status: 403 },
    );
  }
  if (hostname === "novixaretail.com" && !pathname.startsWith("/.well-known/")) {
    const target = request.nextUrl.clone();
    target.protocol = "https:";
    target.hostname = "www.novixaretail.com";
    target.port = "";
    return NextResponse.redirect(target, 308);
  }
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);
  if (
    pathname.startsWith("/admin") &&
    pathname !== "/admin/login" &&
    !request.cookies.get("novixa_admin_session")?.value
  ) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (
    pathname.startsWith("/account") &&
    pathname !== "/account/reset-password" &&
    !request.cookies.get("novixa_customer_session")?.value
  ) {
    const target = new URL("/login", request.url);
    target.searchParams.set("next", pathname);
    return NextResponse.redirect(target);
  }
  const response = NextResponse.next({ request: { headers } });
  if (/^\/(api\/(auth|orders|payments|wallets)|account|admin)/.test(pathname))
    response.headers.set("Cache-Control", "no-store");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
