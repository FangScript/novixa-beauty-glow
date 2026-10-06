import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedAdmin, getAuthenticatedCustomer } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    const customer = await getAuthenticatedCustomer();

    if (!admin && !customer) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { id, email, name } = body;

    if (!email) {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // If not admin, can only sync own profile
    if (!admin && customer && customer.email.toLowerCase() !== cleanEmail) {
      return NextResponse.json({ ok: false, error: "Unauthorized profile sync" }, { status: 403 });
    }
    const cleanName = name?.trim() || cleanEmail.split("@")[0] || "Customer";

    await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {
        lastLoginAt: new Date(),
        ...(name && { name: cleanName }),
      },
      create: {
        id: id || undefined,
        email: cleanEmail,
        name: cleanName,
        role: "CUSTOMER",
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to sync customer profile with database:", error);
    return NextResponse.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}
