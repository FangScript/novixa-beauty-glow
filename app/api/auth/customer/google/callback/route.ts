import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginWithGoogle } from "@/lib/auth/session";

export async function GET(request: Request) {
  const appUrl = process.env.APP_URL || "http://localhost:8080";
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const oauthError = searchParams.get("error");

  // User cancelled or denied
  if (oauthError) {
    return NextResponse.redirect(`${appUrl}/login?error=google_cancelled`);
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("novixa_google_state")?.value;
  cookieStore.delete("novixa_google_state");

  if (!savedState || savedState !== returnedState) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=no_code`);
  }

  // Extract the ?next= destination from state (after the | separator)
  const [, encodedNext] = savedState.split("|");
  const next = encodedNext ? decodeURIComponent(encodedNext) : "/account";

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/customer/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(`${appUrl}/login?error=token_failed`);
    }

    const tokenData = await tokenRes.json();

    // 2. Fetch Google user profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      console.error("Google profile fetch failed:", await profileRes.text());
      return NextResponse.redirect(`${appUrl}/login?error=profile_failed`);
    }

    const profile = await profileRes.json();
    // profile: { id, email, name, picture, verified_email }

    if (!profile.email || !profile.id) {
      return NextResponse.redirect(`${appUrl}/login?error=no_email`);
    }

    // 3. Find or create user, create session cookie
    const result = await loginWithGoogle(
      profile.id,
      profile.email,
      profile.name || profile.email.split("@")[0],
    );

    if (!result.ok) {
      console.error("loginWithGoogle failed:", result.error);
      return NextResponse.redirect(`${appUrl}/login?error=db_error`);
    }

    // 4. Sync email to localStorage via a redirect with a cookie hint
    // (The context will pick up the session on next /api/auth/customer/me call)
    const response = NextResponse.redirect(`${appUrl}${next}`);
    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
  }
}
