import { NextResponse } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/session";

export async function GET() {
  const user = await getAuthenticatedCustomer();
  if (!user) {
    return NextResponse.json({ ok: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ ok: true, user });
}
