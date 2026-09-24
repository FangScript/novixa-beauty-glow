import { NextResponse } from "next/server";
import { registerCustomer } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name?.trim()) {
      return NextResponse.json({ ok: false, error: "Full name is required." }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ ok: false, error: "Email address is required." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const result = await registerCustomer(name, email, password);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true, user: result.user });
  } catch (error) {
    console.error("Customer register error:", error);
    return NextResponse.json(
      { ok: false, error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}
