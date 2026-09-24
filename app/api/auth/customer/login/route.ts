import { NextResponse } from "next/server";
import { loginCustomer } from "@/lib/auth/session";

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

    const result = await loginCustomer(email, password);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }

    return NextResponse.json({ ok: true, user: result.user });
  } catch (error) {
    console.error("Customer login error:", error);
    return NextResponse.json(
      { ok: false, error: "Login failed. Please try again." },
      { status: 500 },
    );
  }
}
