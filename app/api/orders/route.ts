import { NextResponse } from "next/server";
import prisma from "@/lib/db/client";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, customer, address } = body;

    if (!items || !items.length) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    const orderNumber = `NV-${Math.floor(1000 + Math.random() * 9000)}`;

    return NextResponse.json({
      ok: true,
      order: {
        orderNumber,
        status: "PENDING",
        customer,
        address,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to record order." }, { status: 500 });
  }
}
