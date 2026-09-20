import { NextResponse } from "next/server";
import { logoutAdmin } from "@/lib/auth/session";

export async function POST() {
  await logoutAdmin();
  return NextResponse.json({ ok: true });
}
