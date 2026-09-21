import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.APP_URL || "http://localhost:8080";

  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth is not configured. Add GOOGLE_CLIENT_ID to .env" },
      { status: 503 },
    );
  }

  // Capture the ?next= param to preserve redirect destination through the OAuth flow
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") || "/account";

  // Generate a CSRF state token
  const state = randomBytes(16).toString("hex") + "|" + encodeURIComponent(next);

  // Store state in a short-lived httpOnly cookie for validation in callback
  const cookieStore = await cookies();
  cookieStore.set("novixa_google_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const redirectUri = `${appUrl}/api/auth/customer/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    state,
    prompt: "select_account",
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(googleAuthUrl);
}
