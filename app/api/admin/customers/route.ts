import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedAdmin } from "@/lib/auth/session";

export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Administrator session required." },
        { status: 401 },
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ customers: [] });
    }

    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone ?? "",
      orders: c._count.orders,
      joined: c.createdAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    }));

    return NextResponse.json({ customers: mapped, total: mapped.length });
  } catch (error) {
    console.error("GET /api/admin/customers error:", error);
    return NextResponse.json({ customers: [] });
  }
}
