import { NextResponse } from "next/server";
import { getBaseAppUrl } from "@/lib/auth/google-oauth";
// Existing users retain their database records. Sign in using direct Google OAuth
// or recover the database password; legacy external sessions no longer authorize APIs.
export async function GET(request: Request) {
  return NextResponse.redirect(getBaseAppUrl(request) + "/login?error=legacy_session_expired");
}
