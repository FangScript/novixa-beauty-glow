import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

const defaultCoupons: Record<string, { type: "PERCENTAGE" | "FIXED"; value: number; minimumOrder: number }> = {
  GLOW15: { type: "PERCENTAGE", value: 15, minimumOrder: 50 },
  LUXE20: { type: "FIXED", value: 20, minimumOrder: 100 },
  WELCOME10: { type: "PERCENTAGE", value: 10, minimumOrder: 40 },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "Please enter a coupon code." },
        { status: 400 },
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const currentSubtotal = Number(subtotal) || 0;

    if (process.env.DATABASE_URL) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: cleanCode },
      });

      if (!coupon || !coupon.active) {
        return NextResponse.json(
          { valid: false, error: "Invalid or inactive promotional code." },
          { status: 400 },
        );
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
        return NextResponse.json(
          { valid: false, error: "This promotional code has expired." },
          { status: 400 },
        );
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return NextResponse.json(
          { valid: false, error: "This promotional code has reached its maximum usage limit." },
          { status: 400 },
        );
      }

      if (currentSubtotal < coupon.minimumOrder) {
        return NextResponse.json(
          {
            valid: false,
            error: `Code ${cleanCode} requires a minimum order value of £${coupon.minimumOrder}.`,
          },
          { status: 400 },
        );
      }

      let discount = 0;
      if (coupon.type === "PERCENTAGE") {
        discount = Math.round((currentSubtotal * coupon.value) / 100);
      } else {
        discount = Math.min(currentSubtotal, coupon.value);
      }

      return NextResponse.json({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
        },
        discount,
        message:
          coupon.type === "PERCENTAGE"
            ? `${coupon.code} applied: ${coupon.value}% discount (-£${discount})`
            : `${coupon.code} applied: -£${discount} discount`,
      });
    }

    // Fallback in-memory validation when database is not connected
    const fallback = defaultCoupons[cleanCode];
    if (!fallback) {
      return NextResponse.json(
        { valid: false, error: "Invalid promotional code." },
        { status: 400 },
      );
    }

    if (currentSubtotal < fallback.minimumOrder) {
      return NextResponse.json(
        {
          valid: false,
          error: `Code ${cleanCode} requires a minimum order of £${fallback.minimumOrder}.`,
        },
        { status: 400 },
      );
    }

    let discount = 0;
    if (fallback.type === "PERCENTAGE") {
      discount = Math.round((currentSubtotal * fallback.value) / 100);
    } else {
      discount = Math.min(currentSubtotal, fallback.value);
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: `c-${cleanCode}`,
        code: cleanCode,
        type: fallback.type,
        value: fallback.value,
      },
      discount,
      message: `${cleanCode} applied: -£${discount}`,
    });
  } catch (error: any) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Unable to validate coupon code." },
      { status: 500 },
    );
  }
}
