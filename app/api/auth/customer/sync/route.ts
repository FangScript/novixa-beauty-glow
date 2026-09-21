import { NextResponse } from "next/server";
import prisma from "@/lib/db/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, email, name } = body;

    if (!email) {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name?.trim() || cleanEmail.split("@")[0] || "Customer";

    await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {
        lastLoginAt: new Date(),
      },
      create: {
        id: id || undefined,
        email: cleanEmail,
        name: cleanName,
        role: "CUSTOMER",
        lastLoginAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to sync customer profile with database:", error);
    return NextResponse.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}
