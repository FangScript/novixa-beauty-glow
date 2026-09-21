import { NextResponse } from "next/server";
import { logoutCustomer } from "@/lib/auth/session";

export async function POST() {
  await logoutCustomer();
  return NextResponse.json({ ok: true });
}
