import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { createPayPalOrder } from "@/lib/payments/paypal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, couponCode, shippingMethodId, shippingAddress, paymentSource } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database configuration error. Please try again shortly." },
        { status: 503 },
      );
    }

    // Resolve live authoritative product prices from PostgreSQL (strictly active products)
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, status: "ACTIVE" },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let subtotal = 0;
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Item is no longer available or has been deactivated.` },
          { status: 400 },
        );
      }
      const qty = Math.max(0.01, Math.round(Number(item.quantity) * 100) / 100);
      if (product.stock < qty) {
        return NextResponse.json(
          { error: `Insufficient stock for "${product.name}". Only ${product.stock} available.` },
          { status: 400 },
        );
      }
      const unitPrice = Number(product.salePrice ?? product.price);
      subtotal += unitPrice * qty;
    }
    subtotal = Math.round(subtotal * 100) / 100;

    // Calculate authoritative coupon discount
    let discount = 0;
    const requestedCoupon = (couponCode || "").trim().toUpperCase();
    if (requestedCoupon) {
      const foundCoupon = await prisma.coupon
        .findUnique({ where: { code: requestedCoupon } })
        .catch(() => null);

      if (
        foundCoupon &&
        foundCoupon.active &&
        (!foundCoupon.expiresAt || new Date(foundCoupon.expiresAt).getTime() > Date.now()) &&
        (!foundCoupon.usageLimit || foundCoupon.usageCount < foundCoupon.usageLimit) &&
        subtotal >= Number(foundCoupon.minimumOrder)
      ) {
        const couponVal = Number(foundCoupon.value);
        if (foundCoupon.type === "PERCENTAGE") {
          discount = Math.round(((subtotal * couponVal) / 100) * 100) / 100;
        } else {
          discount = Math.min(subtotal, Math.round(couponVal * 100) / 100);
        }
      }
    }

    // Determine authoritative delivery charge
    let shipping = 4.95;
    let selectedMethodName = "Normal Delivery";

    if (shippingMethodId) {
      const dbMethod = await prisma.shippingMethod
        .findUnique({ where: { id: shippingMethodId } })
        .catch(() => null);
      if (dbMethod && dbMethod.active) {
        shipping = Number(dbMethod.price);
        selectedMethodName = dbMethod.name;
      }
    } else {
      const defaultMethod = await prisma.shippingMethod
        .findFirst({ where: { active: true, isDefault: true } })
        .catch(() => null);
      if (defaultMethod) {
        shipping = Number(defaultMethod.price);
        selectedMethodName = defaultMethod.name;
      }
    }

    // Complimentary UK Delivery policy: Orders over £70 qualify for free standard shipping
    const isStandardOrNormal =
      !selectedMethodName ||
      selectedMethodName.toLowerCase().includes("normal") ||
      selectedMethodName.toLowerCase().includes("standard");

    if (subtotal >= 70 && isStandardOrNormal) {
      shipping = 0;
    }
    shipping = Math.round(shipping * 100) / 100;

    const total = Math.max(
      0.01,
      Math.round((Math.max(0, subtotal - discount) + shipping) * 100) / 100,
    );

    const tempOrderRef = `NVX-${Date.now().toString().slice(-6)}`;

    const paymentSourceType =
      paymentSource === "card"
        ? "card"
        : paymentSource === "apple_pay"
          ? "apple_pay"
          : paymentSource === "google_pay"
            ? "google_pay"
            : "paypal";

    const paypalOrder = await createPayPalOrder({
      amount: total,
      currency: "GBP",
      orderNumber: tempOrderRef,
      description: "Novixa Beauty & Glow Luxury Purchase",
      paymentSourceType,
      shippingAddress,
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
