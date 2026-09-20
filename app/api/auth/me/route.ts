import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth/session";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, admin: null }, { status: 401 });
  }
  return NextResponse.json({ ok: true, admin });
}
