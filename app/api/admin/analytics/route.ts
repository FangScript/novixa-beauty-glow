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
      return NextResponse.json({
        revenue: 0,
        orders: 0,
        customers: 0,
        lowStock: 0,
        products: 0,
        pendingOrders: 0,
      });
    }

    const [
      revenueResult,
      ordersCount,
      customersCount,
      productsCount,
      lowStockCount,
      pendingOrdersCount,
    ] = await Promise.all([
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: { in: ["PAID", "AUTHORIZED"] } },
      }),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.product.count({ where: { status: "ACTIVE", stock: { lte: 8 } } }),
      prisma.order.count({ where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      revenue: revenueResult._sum.total ?? 0,
      orders: ordersCount,
      customers: customersCount,
      products: productsCount,
      lowStock: lowStockCount,
      pendingOrders: pendingOrdersCount,
    });
  } catch (error) {
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json({
      revenue: 0,
      orders: 0,
      customers: 0,
      lowStock: 0,
      products: 0,
      pendingOrders: 0,
    });
  }
}
