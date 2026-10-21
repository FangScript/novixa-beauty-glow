import { readJson, apiFailure, limitAttempts, loginSchema } from "@/lib/security/api";
import { NextResponse } from "next/server";
import { loginCustomer } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await readJson(request, loginSchema);
    limitAttempts("app/api/auth/customer/login/route.ts" + ":" + body.email);
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 },
      );
    }

    const result = await loginCustomer(email, password);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }

    return NextResponse.json({ ok: true, user: result.user });
  } catch (error) {
    console.error("Customer login error:", error);
    return apiFailure(error, "Authentication request failed. Please try again.");
  }
}
