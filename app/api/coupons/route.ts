import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

const defaultCoupons = [
  {
    id: "c-1",
    code: "GLOW15",
    type: "PERCENTAGE",
    value: 15,
    minimumOrder: 3000,
    usageLimit: 200,
    usageCount: 48,
    active: true,
    expiresAt: "2026-12-31T23:59:59.000Z",
  },
  {
    id: "c-2",
    code: "LUXE1000",
    type: "FIXED",
    value: 1000,
    minimumOrder: 8000,
    usageLimit: 100,
    usageCount: 22,
    active: true,
    expiresAt: "2026-11-30T23:59:59.000Z",
  },
  {
    id: "c-3",
    code: "WELCOME10",
    type: "PERCENTAGE",
    value: 10,
    minimumOrder: 2000,
    usageLimit: null,
    usageCount: 115,
    active: true,
    expiresAt: null,
  },
];

// ─── GET /api/coupons ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const coupons = await prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
      });

      if (coupons.length > 0) {
        return NextResponse.json({ coupons, source: "database" });
      }

      // If database has 0 coupons, seed defaults
      for (const def of defaultCoupons) {
        await prisma.coupon.upsert({
          where: { code: def.code },
          update: {},
          create: {
            code: def.code,
            type: def.type as any,
            value: def.value,
            minimumOrder: def.minimumOrder,
            usageLimit: def.usageLimit,
            usageCount: def.usageCount,
            active: def.active,
            expiresAt: def.expiresAt ? new Date(def.expiresAt) : null,
          },
        }).catch(() => null);
      }

      const seeded = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
      return NextResponse.json({ coupons: seeded, source: "database" });
    }
  } catch (error) {
    console.warn("GET /api/coupons DB query error, using defaults:", error);
  }

  return NextResponse.json({ coupons: defaultCoupons, source: "default" });
}

// ─── POST /api/coupons ────────────────────────────────────────────────────────
export async function POST(request: Request) {
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
    return NextResponse.json(
      { error: error.message || "Failed to save coupon." },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/coupons?id=xxx ───────────────────────────────────────────────
export async function DELETE(request: Request) {
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
