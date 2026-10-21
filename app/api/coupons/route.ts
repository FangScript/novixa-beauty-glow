import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedAdmin } from "@/lib/auth/session";

// ─── GET /api/coupons ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized. Admin session required." }, { status: 401 });
    }

    if (process.env.DATABASE_URL) {
      const coupons = await prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ coupons, source: "database" });
    }
  } catch (error) {
    console.warn("GET /api/coupons database query failed:", error);
    return NextResponse.json({ error: "Coupons are temporarily unavailable." }, { status: 503 });
  }

  return NextResponse.json({ coupons: [], error: "Database is not configured." }, { status: 503 });
}

// ─── POST /api/coupons ────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized. Administrator authentication required." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { code, type, value, minimumOrder, usageLimit, expiresAt, active } = body;

    if (!code || !type || value === undefined) {
      return NextResponse.json(
        { error: "Coupon code, discount type, and value are required." },
        { status: 400 },
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const discountType = type.toUpperCase() === "FIXED" ? "FIXED" : "PERCENTAGE";
    const numValue = Number(value);
    const numMin = Number(minimumOrder) || 0;
    const numLimit = usageLimit ? Number(usageLimit) : null;
    const expDate = expiresAt ? new Date(expiresAt) : null;

    if (process.env.DATABASE_URL) {
      const coupon = await prisma.coupon.upsert({
        where: { code: cleanCode },
        update: {
          type: discountType as any,
          value: numValue,
          minimumOrder: numMin,
          usageLimit: numLimit,
          expiresAt: expDate,
          active: active !== undefined ? Boolean(active) : true,
        },
        create: {
          code: cleanCode,
          type: discountType as any,
          value: numValue,
          minimumOrder: numMin,
          usageLimit: numLimit,
          expiresAt: expDate,
          active: active !== undefined ? Boolean(active) : true,
        },
      });

      return NextResponse.json({ success: true, coupon });
    }

    return NextResponse.json({
      success: true,
      coupon: {
        id: `c-${Date.now()}`,
        code: cleanCode,
        type: discountType,
        value: numValue,
        minimumOrder: numMin,
        usageLimit: numLimit,
        usageCount: 0,
        expiresAt: expiresAt || null,
        active: true,
      },
    });
  } catch (error: any) {
    console.error("POST /api/coupons error:", error);
    return NextResponse.json({ error: error.message || "Failed to save coupon." }, { status: 500 });
  }
}

// ─── DELETE /api/coupons?id=xxx ───────────────────────────────────────────────
export async function DELETE(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized. Administrator authentication required." },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const code = searchParams.get("code");

    if (!id && !code) {
      return NextResponse.json({ error: "Coupon ID or code is required." }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      if (id) {
        await prisma.coupon.delete({ where: { id } }).catch(() => null);
      } else if (code) {
        await prisma.coupon.delete({ where: { code: code.toUpperCase() } }).catch(() => null);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/coupons error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete coupon." },
      { status: 500 },
    );
  }
}
