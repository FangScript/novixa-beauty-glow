import { NextResponse } from "next/server";
import { loginAdmin } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
    return NextResponse.json(
      { ok: false, error: "Authentication service error." },
      { status: 500 },
    );
  }
}
