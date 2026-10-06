import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginWithGoogle, CUSTOMER_SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/session";
import {
  getBaseAppUrl,
  getGoogleRedirectUri,
  verifySignedState,
} from "@/lib/auth/google-oauth";
import { sanitizeRedirect } from "@/lib/auth/redirect";

export async function GET(request: Request) {
  const appUrl = getBaseAppUrl(request);
  const redirectUri = getGoogleRedirectUri(request);
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const oauthError = searchParams.get("error");

  // User cancelled or denied permissions in Google consent screen
  if (oauthError) {
    console.warn("Google OAuth cancelled by user:", oauthError);
    return NextResponse.redirect(`${appUrl}/login?error=google_cancelled`);
  }

  if (!code) {
    console.error("Google OAuth callback received no code.");
    return NextResponse.redirect(`${appUrl}/login?error=no_code`);
  }

  // 1. Validate CSRF state (Dual check: cryptographic HMAC signature OR cookie match)
  const cookieStore = await cookies();
  const savedCookieState = cookieStore.get("novixa_google_state")?.value;

  const verifiedState = verifySignedState(returnedState);
  const cookieMatches = Boolean(
    savedCookieState && returnedState && savedCookieState === returnedState,
  );

  if (!verifiedState.valid && !cookieMatches) {
    console.error("Google OAuth state validation failed:", {
      returnedState,
      savedCookieState,
      hmacValid: verifiedState.valid,
    });
    return NextResponse.redirect(`${appUrl}/login?error=invalid_state`);
  }

  const nextDestination = verifiedState.valid ? verifiedState.next : "/account";

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Google OAuth credentials missing in environment variables.");
      return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
    }

    // 2. Exchange authorization code for tokens directly with Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Google token exchange failed:", {
        status: tokenRes.status,
        body: errText,
        sentRedirectUri: redirectUri,
      });
      return NextResponse.redirect(`${appUrl}/login?error=token_failed`);
    }

    const tokenData = await tokenRes.json();

    // 3. Fetch user profile from Google UserInfo endpoint
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error("Google profile fetch failed:", {
        status: profileRes.status,
        body: errText,
      });
      return NextResponse.redirect(`${appUrl}/login?error=profile_failed`);
    }

    const profile = await profileRes.json();

    if (!profile.email || !profile.id) {
      console.error("Google profile missing email or id:", profile);
      return NextResponse.redirect(`${appUrl}/login?error=no_email`);
    }

    // 4. Find or create user in PostgreSQL and create session
    const result = await loginWithGoogle(
      profile.id,
      profile.email,
      profile.name || profile.email.split("@")[0],
    );

    if (!result.ok) {
      console.error("loginWithGoogle database error:", result.error);
      return NextResponse.redirect(`${appUrl}/login?error=db_error`);
    }

    // 5. Construct redirect to destination safely (prevent open redirect)
    const dest = sanitizeRedirect(nextDestination, "/account");
    const response = NextResponse.redirect(`${appUrl}${dest}`);

    // 6. Explicitly attach session cookie to the redirect HTTP response headers
    response.cookies.set(CUSTOMER_SESSION_COOKIE, result.rawSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });

    // Clear the temporary state cookie
    response.cookies.set("novixa_google_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Unhandled Google OAuth callback error:", error);
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`);
  }
}
