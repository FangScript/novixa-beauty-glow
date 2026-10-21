import { readJson, apiFailure, limitAttempts, loginSchema } from "@/lib/security/api";
import { NextResponse } from "next/server";
import { loginAdmin } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await readJson(request, loginSchema);
    limitAttempts("app/api/auth/login/route.ts" + ":" + body.email);
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 },
      );
    }

    const result = await loginAdmin(email, password);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }

    return NextResponse.json({ ok: true, admin: result.admin });
  } catch (error) {
    console.error("Login API error:", error);
    return apiFailure(error, "Authentication request failed. Please try again.");
  }
}
