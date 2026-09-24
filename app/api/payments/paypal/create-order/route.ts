import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { createPayPalOrder } from "@/lib/payments/paypal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, couponCode, shippingMethodId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    let subtotal = 0;

    if (process.env.DATABASE_URL) {
      const productIds = items.map((i: any) => i.productId);
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      for (const item of items) {
        const product = productMap.get(item.productId);
        const qty = Math.max(1, Number(item.quantity) || 1);
        if (product) {
          const unitPrice = product.salePrice ?? product.price;
          subtotal += unitPrice * qty;
        }
      }
    } else {
      // Fallback if DB is disconnected
      subtotal = items.reduce(
        (sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
        0,
      );
    }

    // Calculate coupon discount
    let discount = 0;
    const requestedCoupon = (couponCode || "").trim().toUpperCase();
    if (requestedCoupon && process.env.DATABASE_URL) {
      const foundCoupon = await prisma.coupon
        .findUnique({ where: { code: requestedCoupon } })
        .catch(() => null);

      if (
        foundCoupon &&
        foundCoupon.active &&
        (!foundCoupon.expiresAt || new Date(foundCoupon.expiresAt).getTime() > Date.now()) &&
        (!foundCoupon.usageLimit || foundCoupon.usageCount < foundCoupon.usageLimit) &&
        subtotal >= foundCoupon.minimumOrder
      ) {
        if (foundCoupon.type === "PERCENTAGE") {
          discount = Math.round((subtotal * foundCoupon.value) / 100);
        } else {
          discount = Math.min(subtotal, foundCoupon.value);
        }
      }
    }

    // Determine authoritative delivery charge
    let shipping = 0.20;
    if (process.env.DATABASE_URL) {
      if (shippingMethodId) {
        const dbMethod = await prisma.shippingMethod
          .findUnique({ where: { id: shippingMethodId } })
          .catch(() => null);
        if (dbMethod && dbMethod.active) {
          shipping = dbMethod.price;
        }
      } else {
        const defaultMethod = await prisma.shippingMethod
          .findFirst({ where: { active: true, isDefault: true } })
          .catch(() => null);
        if (defaultMethod) {
          shipping = defaultMethod.price;
        }
      }
    }

    const total = Math.max(0.01, Math.round((Math.max(0, subtotal - discount) + shipping) * 100) / 100);

    const tempOrderRef = `NVX-${Date.now().toString().slice(-6)}`;

    const paypalOrder = await createPayPalOrder({
      amount: total,
      currency: "GBP",
      orderNumber: tempOrderRef,
      description: "Novixa Beauty & Glow Luxury Purchase",
    });

    return NextResponse.json({
      ok: true,
      id: paypalOrder.id,
      amount: total,
      currency: "GBP",
    });
  } catch (error: any) {
    console.error("PayPal Create Order Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize PayPal transaction" },
      { status: 500 },
    );
  }
}
