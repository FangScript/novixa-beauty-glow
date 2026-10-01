import { NextResponse } from "next/server";
import { createSignedState, getGoogleRedirectUri } from "@/lib/auth/google-oauth";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.error("Google OAuth error: GOOGLE_CLIENT_ID is not configured in .env");
    return NextResponse.json(
      { error: "Google OAuth is not configured. Add GOOGLE_CLIENT_ID to .env" },
      { status: 503 },
    );
  }

  // Capture the ?next= param to preserve destination (e.g. /account, /checkout)
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") || "/account";

  // Create HMAC-signed state token containing nonce, timestamp, and destination
  const state = createSignedState(next);

  // Compute canonical redirect URI (must match Google Cloud Console and callback)
  const redirectUri = getGoogleRedirectUri(request);

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

  const response = NextResponse.redirect(googleAuthUrl);

  // Set the state cookie directly on the redirect response headers
  response.cookies.set("novixa_google_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 900, // 15 minutes
    path: "/",
  });

  return response;
}
