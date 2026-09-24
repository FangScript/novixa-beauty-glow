import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { verifyPaymentServerSide, type PaymentMethod } from "@/lib/payments/processor";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const userId = searchParams.get("userId");

  try {
    if (process.env.DATABASE_URL) {
      // Build the where clause based on available params
      let whereClause: any = {};

      if (userId) {
        // Find user by matching the userId (stored as cuid) or by email
        const matchedUser = await prisma.user.findFirst({
          where: {
            OR: [{ id: userId }, ...(userId.includes("@") ? [{ email: userId }] : [])],
          },
          select: { id: true },
        });

        if (matchedUser) {
          whereClause = { userId: matchedUser.id };
        } else {
          whereClause = { id: { equals: "__none__" } };
        }
      } else if (email) {
        whereClause = {
          OR: [
            {
              shippingAddressSnapshot: {
                path: ["email"],
                string_contains: email,
              },
            },
            {
              user: { email: { equals: email, mode: "insensitive" } },
            },
          ],
        };
      }

      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          items: true,
          payment: true,
          shippingMethod: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return NextResponse.json({ orders });
    }
  } catch (error) {
    console.error("Failed to fetch orders:", error);
  }

  return NextResponse.json({ orders: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, customer, address, shippingMethodId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Your shopping bag is empty." }, { status: 400 });
    }

    if (!customer?.email || !customer?.name) {
      return NextResponse.json({ error: "Customer name and email are required." }, { status: 400 });
    }

    if (!address?.line1 || !address?.city || !address?.state || !address?.postalCode) {
      return NextResponse.json(
        { error: "Complete shipping address is required." },
        { status: 400 },
      );
    }

    if (!process.env.DATABASE_URL) {
      const fallbackOrderNumber = `NVX-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      return NextResponse.json({
        ok: true,
        order: {
          id: `ord-${Date.now()}`,
          orderNumber: fallbackOrderNumber,
          status: "PENDING",
          paymentStatus: "UNPAID",
          subtotal: 5000,
          shipping: 0,
          total: 5000,
          createdAt: new Date().toISOString(),
          shippingAddressSnapshot: { ...address, ...customer },
          items: items.map((i: any, idx: number) => ({
            id: `item-${idx}`,
            productName: `Item ${idx + 1}`,
            sku: `SKU-${idx}`,
            unitPrice: 2500,
            quantity: i.quantity,
          })),
        },
      });
    }

    // Resolve products from PostgreSQL
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Validate stock and calculate authoritative prices
    let subtotal = 0;
    const lineItemsToCreate: {
      productId: string;
      productName: string;
      sku: string;
      unitPrice: number;
      quantity: number;
      imageUrl: string;
    }[] = [];

    for (const item of items) {
      const itemQty = Math.round(Number(item.quantity) * 100) / 100;
      if (isNaN(itemQty) || itemQty <= 0) {
        return NextResponse.json(
          { error: `Invalid item quantity specified for item ${item.productId}` },
          { status: 400 },
        );
      }

      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found or no longer available (ID: ${item.productId})` },
          { status: 400 },
        );
      }

      if (product.stock < itemQty) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${product.name}". Only ${product.stock} left in stock.`,
          },
          { status: 400 },
        );
      }

      const unitPrice = product.salePrice ?? product.price;
      subtotal += unitPrice * itemQty;

      lineItemsToCreate.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPrice,
        quantity: itemQty,
        imageUrl: product.images[0]?.url ?? "/images/product-perfume.jpg",
      });
    }

    let discount = 0;
    let validCouponId: string | null = null;
    const requestedCouponCode = (body.couponCode || "").trim().toUpperCase();

    if (requestedCouponCode) {
      const foundCoupon = await prisma.coupon
        .findUnique({
          where: { code: requestedCouponCode },
        })
        .catch(() => null);

      if (
        foundCoupon &&
        foundCoupon.active &&
        (!foundCoupon.expiresAt || new Date(foundCoupon.expiresAt).getTime() > Date.now()) &&
        (!foundCoupon.usageLimit || foundCoupon.usageCount < foundCoupon.usageLimit) &&
        subtotal >= foundCoupon.minimumOrder
      ) {
        validCouponId = foundCoupon.id;
        if (foundCoupon.type === "PERCENTAGE") {
          discount = Math.round((subtotal * foundCoupon.value) / 100);
        } else {
          discount = Math.min(subtotal, foundCoupon.value);
        }
      }
    }

    // Authoritative Shipping Method Calculation
    let shipping = 0.20;
    let resolvedShippingMethodId: string | null = null;
    let resolvedShippingMethodName: string | null = "Normal Delivery";

    if (shippingMethodId) {
      const dbMethod = await prisma.shippingMethod
        .findUnique({ where: { id: shippingMethodId } })
        .catch(() => null);
      if (dbMethod && dbMethod.active) {
        shipping = dbMethod.price;
        resolvedShippingMethodId = dbMethod.id;
        resolvedShippingMethodName = dbMethod.name;
      }
    }

    if (!resolvedShippingMethodId) {
      const defaultMethod = await prisma.shippingMethod
        .findFirst({ where: { active: true, isDefault: true } })
        .catch(() => null);
      if (defaultMethod) {
        shipping = defaultMethod.price;
        resolvedShippingMethodId = defaultMethod.id;
        resolvedShippingMethodName = defaultMethod.name;
      }
    }

    const tax = 0;
    const total = Math.max(0, Math.round((Math.max(0, subtotal - discount) + shipping + tax) * 100) / 100);
    const orderNumber = `NVX-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const fullShippingSnapshot = {
      fullName: customer.name,
      email: customer.email,
      phone: customer.phone ?? "",
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country ?? "GB",
    };

    // Resolve the Prisma user ID from the provided userId (Supabase UID or email)
    let resolvedPrismaUserId: string | null = null;
    if (body.userId) {
      const prismaUser = await prisma.user
        .findFirst({
          where: {
            OR: [{ id: body.userId }, { email: customer.email.trim() }],
          },
          select: { id: true },
        })
        .catch(() => null);
      resolvedPrismaUserId = prismaUser?.id ?? null;
    } else {
      // Try to link by email even without explicit userId
      const prismaUser = await prisma.user
        .findUnique({
          where: { email: customer.email.trim() },
          select: { id: true },
        })
        .catch(() => null);
      resolvedPrismaUserId = prismaUser?.id ?? null;
    }

    const paymentMethod = (body.paymentMethod || "COD").toUpperCase() as PaymentMethod;
    const paymentDetails = body.paymentDetails || {};

    // Normalize card details if submitted with alternate field names
    const normalizedPaymentDetails = {
      ...paymentDetails,
      nameOnCard: paymentDetails.nameOnCard || paymentDetails.cardholderName || customer.name,
      expiry:
        paymentDetails.expiry ||
        (paymentDetails.expMonth && paymentDetails.expYear
          ? `${paymentDetails.expMonth.padStart(2, "0")}/${paymentDetails.expYear.slice(-2)}`
          : ""),
    };

    // Verify payment server-side using provider-agnostic engine
    const verification = verifyPaymentServerSide(
      paymentMethod,
      normalizedPaymentDetails,
      total,
      "GBP",
    );

    if (!verification.valid) {
      return NextResponse.json(
        {
          error:
            verification.error || "Payment verification failed. Please check your payment details.",
        },
        { status: 400 },
      );
    }

    const orderStatus =
      verification.status === PaymentStatus.PAID ? OrderStatus.CONFIRMED : OrderStatus.PENDING;

    // Execute atomic order placement & stock decrement transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      // 1. Decrement stock
      for (const item of items) {
        const decQty = Math.round(Number(item.quantity) * 100) / 100;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: decQty } },
        });
      }

      // 2. Increment coupon usage if applied
      if (validCouponId) {
        await tx.coupon
          .update({
            where: { id: validCouponId },
            data: { usageCount: { increment: 1 } },
          })
          .catch(() => null);
      }

      // 3. Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          status: orderStatus,
          paymentStatus: verification.status,
          subtotal,
          discount,
          shipping,
          tax,
          total,
          userId: resolvedPrismaUserId,
          couponId: validCouponId,
          shippingMethodId: resolvedShippingMethodId,
          shippingMethodName: resolvedShippingMethodName,
          shippingAddressSnapshot: fullShippingSnapshot,
          items: {
            create: lineItemsToCreate,
          },
          payment: {
            create: {
              provider: verification.provider,
              method: verification.method,
              providerPaymentId: verification.providerPaymentId,
              amount: total,
              currency: "GBP",
              status: verification.status,
              rawStatus: JSON.stringify(verification.metadata || {}),
            },
          },
        },
        include: {
          items: true,
          payment: true,
          shippingMethod: true,
        },
      });

      return newOrder;
    });

    const paymentRecord = (createdOrder as any).payment;

    return NextResponse.json({
      ok: true,
      order: {
        ...createdOrder,
        paymentMethod: verification.method,
        payments: paymentRecord ? [paymentRecord] : [],
      },
    });
  } catch (error: any) {
    console.error("Order placement error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to place order. Please try again." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, trackingNumber, paymentStatus } = body;

    if (!id) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: true, order: body });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(status ? { status: status as OrderStatus } : {}),
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
        ...(paymentStatus ? { paymentStatus: paymentStatus as PaymentStatus } : {}),
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ ok: true, order: updated });
  } catch (error: any) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update order." },
      { status: 500 },
    );
  }
}
